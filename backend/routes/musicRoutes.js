const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

const FALLBACK_SVG = Buffer.from(`
	<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
		<defs>
			<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#1ed760"/>
				<stop offset="100%" stop-color="#0f172a"/>
			</linearGradient>
		</defs>
		<rect width="1000" height="1000" rx="80" fill="url(#g)"/>
		<circle cx="500" cy="430" r="170" fill="#ffffff" fill-opacity="0.12"/>
		<path d="M420 345v210l180-105-180-105z" fill="#ffffff" fill-opacity="0.9"/>
		<text x="500" y="725" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" fill="#f8fff8">Music App</text>
	</svg>
`);

const sendFallbackArtwork = (res) => {
	res.status(200);
	res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
	res.setHeader('Cache-Control', 'public, max-age=3600');
	res.send(FALLBACK_SVG);
};

router.get('/artwork', async (req, res) => {
	const targetUrl = String(req.query.url || '').trim();

	if (!targetUrl) {
		sendFallbackArtwork(res);
		return;
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(targetUrl);
	} catch {
		sendFallbackArtwork(res);
		return;
	}

	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		sendFallbackArtwork(res);
		return;
	}

	try {
		const upstreamResponse = await axios.get(parsedUrl.toString(), {
			responseType: 'stream',
			timeout: 10000,
			maxRedirects: 3,
			validateStatus: () => true,
		});

		if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
			sendFallbackArtwork(res);
			return;
		}

		const contentType = String(upstreamResponse.headers['content-type'] || '').toLowerCase();
		if (!contentType.startsWith('image/')) {
			sendFallbackArtwork(res);
			return;
		}

		res.status(200);
		res.setHeader('Content-Type', upstreamResponse.headers['content-type']);
		res.setHeader('Cache-Control', 'public, max-age=3600');
		upstreamResponse.data.pipe(res);
	} catch (error) {
		sendFallbackArtwork(res);
	}
});

/**
 * Public routes - Jamendo API endpoints
 */

// Get all songs / Trending
router.get('/songs', musicController.getAllSongs);

// Get trending songs (explicit route)
router.get('/trending', musicController.getTrending);

// Search songs
router.get('/search', musicController.searchSongs);

// Search songs from Audius API (explicit search namespace)
router.get('/search/audius', musicController.searchAudiusSongs);

// Unified search across Audius, Jamendo, and MusicBrainz
router.get('/search/all', musicController.searchAllSources);

// Search songs from Audius API
router.get('/audius/search', musicController.searchAudiusSongs);

// Search songs metadata from MusicBrainz API
router.get('/musicbrainz/search', musicController.searchMusicbrainzSongs);

// Get song by ID
router.get('/songs/:id', musicController.getSongById);

// Get songs by artist
router.get('/artist/:artistId', musicController.getSongsByArtist);

// Get songs by album
router.get('/album/:albumId', musicController.getSongsByAlbum);

/**
 * Protected routes - User likes/favorites
 */

// Like a song
router.post('/like', authMiddleware, musicController.likeSong);

// Unlike a song
router.delete('/like/:songId', authMiddleware, musicController.unlikeSong);

// Get user's liked songs
router.get('/liked', authMiddleware, musicController.getLikedSongs);

module.exports = router;
