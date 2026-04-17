const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authMiddleware = require('../middleware/auth');

router.post('/create', authMiddleware, playlistController.createPlaylist);
router.get('/', authMiddleware, playlistController.getUserPlaylists);
router.post('/add-song', authMiddleware, playlistController.addSongToPlaylist);
router.delete('/remove-song', authMiddleware, playlistController.removeSongFromPlaylist);
router.get('/:playlistId/songs', authMiddleware, playlistController.getPlaylistSongs);

module.exports = router;
