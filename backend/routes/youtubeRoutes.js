const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');

router.get('/search', musicController.searchSongs);
router.get('/trending', musicController.getTrending);
router.get('/artists', musicController.getArtists);
router.get('/cache/stats', musicController.getCacheStats);

module.exports = router;
