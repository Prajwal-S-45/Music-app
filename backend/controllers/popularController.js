const popularSongService = require('../services/popularSongService');

exports.getPopularSongs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const songs = await popularSongService.getTopSongs(limit);
    res.json({ success: true, data: songs });
  } catch (err) {
    console.error('Popular songs error:', err);
    res.status(500).json({ error: 'Failed to fetch popular songs' });
  }
};