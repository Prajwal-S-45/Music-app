const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');

router.get('/search', musicController.searchSongs);
router.get('/trending', musicController.getTrending);

module.exports = router;
