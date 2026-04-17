const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const musicController = require('../controllers/musicController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, '..', 'uploads'));
	},
	filename: (req, file, cb) => {
		const timestamp = Date.now();
		const safeOriginalName = file.originalname.replace(/\s+/g, '-');
		cb(null, `${timestamp}-${safeOriginalName}`);
	},
});

const upload = multer({ storage });

router.get('/songs', musicController.getAllSongs);
router.get('/search', musicController.searchSongs);
router.get('/songs/:id', musicController.getSongById);
router.post('/like', authMiddleware, musicController.likeSong);
router.get('/liked', authMiddleware, musicController.getLikedSongs);
router.post('/upload', authMiddleware, adminMiddleware, upload.single('songFile'), musicController.uploadSong);

module.exports = router;
