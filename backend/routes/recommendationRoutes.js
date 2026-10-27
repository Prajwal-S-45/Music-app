const express = require('express');
const router = express.Router();
const popularController = require('../controllers/popularController');
const recommendationController = require('../controllers/recommendationController');
const authMiddleware = require('../middleware/auth');

// Public route - popular songs
router.get('/popular/songs', popularController.getPopularSongs);

// Protected route - user recommendations
router.get('/recommendations', authMiddleware, recommendationController.getRecommendations);
router.get('/artists', authMiddleware, recommendationController.getRecommendedArtists);

module.exports = router;