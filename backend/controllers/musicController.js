const jamendoService = require('../services/jamendoService');
const audiusService = require('../services/audiusService');
const pool = require('../config/database');

const getRequestBaseUrl = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  return `${protocol}://${req.get('host')}`;
};

/**
 * Get all songs / Trending songs from Jamendo
 * @route GET /api/music/songs
 * @query {number} limit - Songs per page (default: 50)
 * @query {number} offset - Pagination offset (default: 0)
 */
exports.getAllSongs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const songs = await jamendoService.getTrendingSongs(limit, offset);

    res.json({
      success: true,
      data: songs,
      pagination: {
        limit,
        offset,
        total: songs.length,
      },
    });
  } catch (error) {
    console.error('Error in getAllSongs:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get trending songs from Jamendo
 * @route GET /api/music/trending
 * @query {number} limit - Songs per page (default: 50)
 * @query {number} offset - Pagination offset (default: 0)
 */
exports.getTrending = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const songs = await jamendoService.getTrendingSongs(limit, offset);

    res.json({
      success: true,
      data: songs,
      pagination: {
        limit,
        offset,
        total: songs.length,
      },
    });
  } catch (error) {
    console.error('Error in getTrending:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search songs from Jamendo
 * @route GET /api/music/search
 * @query {string} query - Search query (required)
 * @query {number} limit - Results per page (default: 50)
 */
exports.searchSongs = async (req, res) => {
  try {
    const { query } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const songs = await jamendoService.searchSongs(query, limit);

    res.json({
      success: true,
      data: songs,
      query: query.trim(),
      total: songs.length,
    });
  } catch (error) {
    console.error('Error in searchSongs:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search songs from Audius
 * @route GET /api/music/audius/search
 * @query {string} query - Search keyword (required)
 * @query {number} limit - Results per page (default: 20)
 */
exports.searchAudiusSongs = async (req, res) => {
  try {
    const { query } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const artworkBaseUrl = getRequestBaseUrl(req);
    const songs = await audiusService.searchTracks(query, limit, artworkBaseUrl);

    res.json({
      success: true,
      source: 'audius',
      query: query.trim(),
      total: songs.length,
      data: songs,
    });
  } catch (error) {
    console.error('Error in searchAudiusSongs:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get song details by ID from Jamendo
 * @route GET /api/music/songs/:id
 * @param {string} id - Jamendo song ID
 */
exports.getSongById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    const song = await jamendoService.getSongById(id);

    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({
      success: true,
      data: song,
    });
  } catch (error) {
    console.error('Error in getSongById:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Like a song (stores in database)
 * @route POST /api/music/like
 * @body {string} songId - Song ID to like
 */
exports.likeSong = async (req, res) => {
  try {
    const { songId } = req.body;
    const userId = req.userId;

    if (!songId) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const connection = await pool.getConnection();

    try {
      // Check if already liked
      const [existing] = await connection.execute(
        'SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?',
        [userId, songId]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Song already liked' });
      }

      // Insert like
      await connection.execute(
        'INSERT INTO liked_songs (user_id, song_id) VALUES (?, ?)',
        [userId, songId]
      );

      res.json({
        success: true,
        message: 'Song liked successfully',
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in likeSong:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Unlike a song
 * @route DELETE /api/music/like/:songId
 * @param {string} songId - Song ID to unlike
 */
exports.unlikeSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.userId;

    if (!songId) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const connection = await pool.getConnection();

    try {
      const result = await connection.execute(
        'DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?',
        [userId, songId]
      );

      if (result[0].affectedRows === 0) {
        return res.status(404).json({ error: 'Like not found' });
      }

      res.json({
        success: true,
        message: 'Song unliked successfully',
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in unlikeSong:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all liked songs for user
 * @route GET /api/music/liked
 */
exports.getLikedSongs = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        'SELECT song_id FROM liked_songs WHERE user_id = ? ORDER BY liked_at DESC',
        [userId]
      );

      // Get Jamendo details for each liked song
      const likedSongs = await Promise.all(
        rows.map(async (row) => {
          try {
            return await jamendoService.getSongById(row.song_id);
          } catch (err) {
            console.warn(`Could not fetch Jamendo details for song ${row.song_id}:`, err.message);
            // Return minimal data if Jamendo lookup fails
            return {
              id: row.song_id,
              title: 'Unknown Title',
              artist: 'Unknown Artist',
              source: 'jamendo',
            };
          }
        })
      );

      // Filter out null/failed lookups
      const validSongs = likedSongs.filter((song) => song !== null);

      res.json({
        success: true,
        data: validSongs,
        total: validSongs.length,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in getLikedSongs:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get songs by artist
 * @route GET /api/music/artist/:artistId
 * @param {string} artistId - Jamendo artist ID
 * @query {number} limit - Results per page (default: 50)
 */
exports.getSongsByArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    if (!artistId) {
      return res.status(400).json({ error: 'Artist ID is required' });
    }

    const songs = await jamendoService.getSongsByArtist(artistId, limit);

    res.json({
      success: true,
      data: songs,
      artistId,
      total: songs.length,
    });
  } catch (error) {
    console.error('Error in getSongsByArtist:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get songs by album
 * @route GET /api/music/album/:albumId
 * @param {string} albumId - Jamendo album ID
 */
exports.getSongsByAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;

    if (!albumId) {
      return res.status(400).json({ error: 'Album ID is required' });
    }

    const songs = await jamendoService.getSongsByAlbum(albumId);

    res.json({
      success: true,
      data: songs,
      albumId,
      total: songs.length,
    });
  } catch (error) {
    console.error('Error in getSongsByAlbum:', error);
    res.status(500).json({ error: error.message });
  }
};
