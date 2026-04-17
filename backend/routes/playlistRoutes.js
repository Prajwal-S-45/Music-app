const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authMiddleware = require('../middleware/auth');

router.post('/create', authMiddleware, playlistController.createPlaylist);
router.get('/', authMiddleware, playlistController.getUserPlaylists);
router.post('/add-song', authMiddleware, playlistController.addSongToPlaylist);
router.get('/:playlistId/songs', playlistController.getPlaylistSongs);

module.exports = router;
