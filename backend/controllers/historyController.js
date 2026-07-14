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

const seedMockHistory = async (connection, userId) => {
  const today = new Date();
  
  const mockItems = [
    {
      type: 'song',
      title: 'Kesariya (From "Brahmāstra")',
      subtitle: 'Arijit Singh • Brahmāstra',
      image: 'https://c.saavncdn.com/191/Kesariya-From-Brahmastra-Hindi-2022-20220717092820-500x500.jpg',
      target: 'XJu8zY1h',
      metadata: JSON.stringify({
        id: 'XJu8zY1h',
        title: 'Kesariya (From "Brahmāstra")',
        artist: 'Arijit Singh',
        cover: 'https://c.saavncdn.com/191/Kesariya-From-Brahmastra-Hindi-2022-20220717092820-500x500.jpg',
        duration: 269,
        source: 'jiosaavn'
      }),
      created_at: today
    },
    {
      type: 'song',
      title: 'Heeriye (From "Jasleen Royal")',
      subtitle: 'Jasleen Royal, Arijit Singh • Heeriye',
      image: 'https://c.saavncdn.com/175/Heeriye-feat-Arijit-Singh-Hindi-2023-20230725061642-500x500.jpg',
      target: '9sT7XhQy',
      metadata: JSON.stringify({
        id: '9sT7XhQy',
        title: 'Heeriye (From "Jasleen Royal")',
        artist: 'Jasleen Royal, Arijit Singh',
        cover: 'https://c.saavncdn.com/175/Heeriye-feat-Arijit-Singh-Hindi-2023-20230725061642-500x500.jpg',
        duration: 200,
        source: 'jiosaavn'
      }),
      created_at: new Date(today.getTime() - 60000 * 20) // 20m ago
    },
    {
      type: 'song',
      title: 'Hawayein',
      subtitle: 'Arijit Singh • Jab Harry Met Sejal',
      image: 'https://c.saavncdn.com/348/Jab-Harry-Met-Sejal-Hindi-2017-20170803155823-500x500.jpg',
      target: '_Y4-Z6r2',
      metadata: JSON.stringify({
        id: '_Y4-Z6r2',
        title: 'Hawayein',
        artist: 'Arijit Singh',
        cover: 'https://c.saavncdn.com/348/Jab-Harry-Met-Sejal-Hindi-2017-20170803155823-500x500.jpg',
        duration: 288,
        source: 'jiosaavn'
      }),
      created_at: new Date(today.getTime() - 60000 * 60) // 1h ago
    },
    {
      type: 'song',
      title: 'Fitoor',
      subtitle: 'Arijit Singh • Fitoor',
      image: 'https://c.saavncdn.com/264/Shamshera-Hindi-2022-20220719191838-500x500.jpg',
      target: '_Lp9x9r_',
      metadata: JSON.stringify({
        id: '_Lp9x9r_',
        title: 'Fitoor',
        artist: 'Arijit Singh',
        cover: 'https://c.saavncdn.com/264/Shamshera-Hindi-2022-20220719191838-500x500.jpg',
        duration: 275,
        source: 'jiosaavn'
      }),
      created_at: new Date(today.getTime() - 60000 * 120) // 2h ago
    },
    {
      type: 'song',
      title: 'Tum Hi Ho',
      subtitle: 'Arijit Singh • Aashiqui 2',
      image: 'https://c.saavncdn.com/464/Aashiqui-2-Hindi-2013-500x500.jpg',
      target: 'v_JqYhPz',
      metadata: JSON.stringify({
        id: 'v_JqYhPz',
        title: 'Tum Hi Ho',
        artist: 'Arijit Singh',
        cover: 'https://c.saavncdn.com/464/Aashiqui-2-Hindi-2013-500x500.jpg',
        duration: 262,
        source: 'jiosaavn'
      }),
      created_at: new Date(today.getTime() - 60000 * 240) // 4h ago
    },
    {
      type: 'song',
      title: 'Raataan Lambiyan',
      subtitle: 'Jubin Nautiyal, Asees Kaur • Shershaah',
      image: 'https://c.saavncdn.com/238/Shershaah-Hindi-2021-20210816155907-500x500.jpg',
      target: '9P1v2r_h',
      metadata: JSON.stringify({
        id: '9P1v2r_h',
        title: 'Raataan Lambiyan',
        artist: 'Jubin Nautiyal, Asees Kaur',
        cover: 'https://c.saavncdn.com/238/Shershaah-Hindi-2021-20210816155907-500x500.jpg',
        duration: 267,
        source: 'jiosaavn'
      }),
      created_at: new Date(today.getTime() - 86400000 - 3600000) // Yesterday, 1h ago
    },
    {
      type: 'search',
      title: 'Arijit Singh',
      subtitle: 'Search query',
      image: null,
      target: '/search?q=Arijit%20Singh',
      metadata: JSON.stringify({ query: 'Arijit Singh', type: 'song' }),
      created_at: new Date(today.getTime() - 60000 * 5)
    },
    {
      type: 'search',
      title: 'Kesariya',
      subtitle: 'Search query',
      image: null,
      target: '/search?q=Kesariya',
      metadata: JSON.stringify({ query: 'Kesariya', type: 'song' }),
      created_at: new Date(today.getTime() - 60000 * 15)
    }
  ];

  for (const item of mockItems) {
    await connection.execute(
      `INSERT INTO history_items (user_id, type, title, subtitle, image, target, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, item.type, item.title, item.subtitle, item.image, item.target, item.metadata, item.created_at]
    );
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.max(sanitizePositiveInteger(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT), 1);
    const offset = sanitizePositiveInteger(req.query.offset, 0);

    const connection = await pool.getConnection();

    try {
      // First check if user history exists
      const [countRows] = await connection.execute(
        'SELECT COUNT(*) AS total FROM history_items WHERE user_id = ?',
        [userId]
      );

      const totalItems = Number(countRows[0]?.total) || 0;

      // Seed if empty and offset is 0
      if (totalItems === 0 && offset === 0) {
        await seedMockHistory(connection, userId);
      }

      // Query history items
      const [rows] = await connection.execute(
        `SELECT id, type, title, subtitle, image, target, metadata, created_at
         FROM history_items
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
         [userId]
      );

      // Re-query total count in case we seeded
      const [finalCountRows] = await connection.execute(
        'SELECT COUNT(*) AS total FROM history_items WHERE user_id = ?',
        [userId]
      );
      const finalTotal = Number(finalCountRows[0]?.total) || 0;

      const rawItems = rows.map(mapHistoryRow);

      return res.json({
        success: true,
        data: rawItems,
        total: finalTotal,
        limit,
        offset,
        hasMore: offset + rows.length < finalTotal,
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

    // No enrichment needed since JioSaavn data is already structured

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
