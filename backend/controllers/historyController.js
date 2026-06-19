const pool = require('../config/database');

const VALID_TYPES = new Set(['song', 'search', 'artist', 'album', 'playlist']);
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const sanitizePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(parsed), 0), max);
};

const normalizeHistoryPayload = (body = {}) => {
  const type = String(body.type || '').trim().toLowerCase();
  const title = String(body.title || '').trim();

  return {
    type,
    title,
    subtitle: String(body.subtitle || '').trim() || null,
    image: String(body.image || body.thumbnail || body.cover || '').trim() || null,
    target: String(body.target || body.url || '').trim() || null,
    metadata: body.metadata && typeof body.metadata === 'object' ? JSON.stringify(body.metadata) : null,
  };
};

const parseHistoryMetadata = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const mapHistoryRow = (row) => {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle || '',
    image: row.image || '',
    target: row.target || '',
    metadata: parseHistoryMetadata(row.metadata),
    timestamp: row.created_at,
  };
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.max(sanitizePositiveInteger(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT), 1);
    const offset = sanitizePositiveInteger(req.query.offset, 0);

    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT id, type, title, subtitle, image, target, metadata, created_at
         FROM history_items
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [userId]
      );

      const [countRows] = await connection.execute(
        'SELECT COUNT(*) AS total FROM history_items WHERE user_id = ?',
        [userId]
      );

      return res.json({
        success: true,
        data: rows.map(mapHistoryRow),
        total: Number(countRows[0]?.total) || 0,
        limit,
        offset,
        hasMore: offset + rows.length < (Number(countRows[0]?.total) || 0),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in getHistory:', error);
    return res.status(500).json({ error: error.message || 'Could not load history' });
  }
};

exports.createHistoryItem = async (req, res) => {
  try {
    const userId = req.userId;
    const payload = normalizeHistoryPayload(req.body);

    if (!VALID_TYPES.has(payload.type)) {
      return res.status(400).json({ error: 'Invalid history type' });
    }

    if (!payload.title) {
      return res.status(400).json({ error: 'History title is required' });
    }

    const connection = await pool.getConnection();

    try {
      const [result] = await connection.execute(
        `INSERT INTO history_items (user_id, type, title, subtitle, image, target, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, payload.type, payload.title, payload.subtitle, payload.image, payload.target, payload.metadata]
      );

      const [rows] = await connection.execute(
        `SELECT id, type, title, subtitle, image, target, metadata, created_at
         FROM history_items
         WHERE id = ? AND user_id = ?`,
        [result.insertId, userId]
      );

      return res.status(201).json({
        success: true,
        data: mapHistoryRow(rows[0]),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in createHistoryItem:', error);
    return res.status(500).json({ error: error.message || 'Could not save history item' });
  }
};

exports.deleteHistoryItem = async (req, res) => {
  try {
    const userId = req.userId;
    const itemId = Number(req.params.id);

    if (!itemId) {
      return res.status(400).json({ error: 'History item id is required' });
    }

    const connection = await pool.getConnection();

    try {
      const [result] = await connection.execute(
        'DELETE FROM history_items WHERE id = ? AND user_id = ?',
        [itemId, userId]
      );

      return res.json({
        success: true,
        removed: result.affectedRows > 0,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in deleteHistoryItem:', error);
    return res.status(500).json({ error: error.message || 'Could not remove history item' });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const connection = await pool.getConnection();

    try {
      const [result] = await connection.execute('DELETE FROM history_items WHERE user_id = ?', [userId]);

      return res.json({
        success: true,
        removed: result.affectedRows,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in clearHistory:', error);
    return res.status(500).json({ error: error.message || 'Could not clear history' });
  }
};
