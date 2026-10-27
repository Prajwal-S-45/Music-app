const recommendationService = require('../services/recommendationService');

const getRecommendations = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const recommendations = await recommendationService.generateRecommendations(userId, {
      historyLimit: parseInt(req.query.historyLimit) || 50,
      fallbackLimit: 20
    });

    res.json({ success: true, data: recommendations });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};

const getPopularSongs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    // Import inside method to avoid require issues
    const popularSongService = require('../services/popularSongService');
    const songs = await popularSongService.getTopSongs(limit);
    res.json({ success: true, data: songs });
  } catch (err) {
    console.error('Popular songs error:', err);
    res.status(500).json({ error: 'Failed to fetch popular songs' });
  }
};

const getRecommendedArtists = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const recommendations = await recommendationService.getRecommendedArtists(userId, limit);

    res.json({ success: true, data: recommendations });
  } catch (err) {
    console.error('Recommended artists error:', err);
    res.status(500).json({ error: 'Failed to fetch recommended artists' });
  }
};

module.exports = {
  getRecommendations,
  getPopularSongs,
  getRecommendedArtists
};