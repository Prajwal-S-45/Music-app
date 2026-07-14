const axios = require('axios');
const pool = require('../config/database');
const cacheService = require('../services/CacheService');
const jioSaavnService = require('../services/JioSaavnService');

const MAX_RESULT_LIMIT = 50;

const isAllowedJioSaavnMediaUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'jiosaavn.com' || host.endsWith('.jiosaavn.com') || host === 'saavncdn.com' || host.endsWith('.saavncdn.com');
  } catch {
    return false;
  }
};

// Curated popular artist list for browse/library view
const POPULAR_ARTISTS_CATALOG = [
  // Indian Artists
  { name: 'Arijit Singh', language: 'Hindi' },
  { name: 'Shreya Ghoshal', language: 'Hindi' },
  { name: 'Sonu Nigam', language: 'Hindi' },
  { name: 'Jubin Nautiyal', language: 'Hindi' },
  { name: 'Neha Kakkar', language: 'Hindi' },
  { name: 'Atif Aslam', language: 'Hindi' },
  { name: 'Kumar Sanu', language: 'Hindi' },
  { name: 'Lata Mangeshkar', language: 'Hindi' },
  { name: 'Kishore Kumar', language: 'Hindi' },
  { name: 'Mohammed Rafi', language: 'Hindi' },
  { name: 'Rahat Fateh Ali Khan', language: 'Hindi' },
  { name: 'Armaan Malik', language: 'Hindi' },
  { name: 'Pritam', language: 'Hindi' },
  { name: 'A.R. Rahman', language: 'Tamil' },
  { name: 'S.P. Balasubrahmanyam', language: 'Telugu' },
  { name: 'Sid Sriram', language: 'Tamil' },
  { name: 'Anirudh Ravichander', language: 'Tamil' },
  { name: 'Vijay Prakash', language: 'Kannada' },
  { name: 'K.J. Yesudas', language: 'Malayalam' },
  { name: 'K.S. Chitra', language: 'Tamil' },
  // Global Artists
  { name: 'Adele', language: 'English' },
  { name: 'Taylor Swift', language: 'English' },
  { name: 'Ed Sheeran', language: 'English' },
  { name: 'The Weeknd', language: 'English' },
  { name: 'Dua Lipa', language: 'English' },
];

exports.getCacheStats = async (req, res) => {
  return res.json({
    success: true,
    cache: {
      status: 'Using generic cache layer',
      redisConnected: cacheService.isRedisConnected
    },
  });
};

exports.getSongs = async (req, res) => {
  // Aliased to getTrending
  return exports.getTrending(req, res);
};

exports.getArtists = async (req, res) => {
  const rawQuery = String(req.query.q || req.query.query || req.query.name || '').trim();
  const languageFilter = String(req.query.language || '').trim();

  // No query = return curated catalog (used by Library > Artists page)
  if (!rawQuery) {
    let catalog = [...POPULAR_ARTISTS_CATALOG];

    if (languageFilter) {
      catalog = catalog.filter(a => a.language.toLowerCase() === languageFilter.toLowerCase());
    }

    const data = catalog.map((a, i) => ({
      id: `catalog-${i}-${a.name.toLowerCase().replace(/\s/g, '-')}`,
      name: a.name,
      language: a.language,
      thumbnail: null, // ArtistCard will fetch image individually via /api/music/artist-image
    }));

    return res.json({
      success: true,
      source: 'catalog',
      total: data.length,
      data,
    });
  }

  // With query = search via JioSaavn
  try {
    const artist = await jioSaavnService.searchArtist(rawQuery);

    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    return res.json({
      success: true,
      source: 'jiosaavn',
      query: rawQuery,
      total: 1,
      data: [artist],
    });
  } catch (error) {
    console.error('Error in getArtists:', error);
    return res.status(500).json({ error: 'Failed to fetch artist details' });
  }
};

exports.getArtistDetails = async (req, res) => {
  const rawQuery = String(req.query.q || req.query.query || req.query.name || '').trim();
  
  if (!rawQuery) {
    return res.status(400).json({ error: 'Artist name is required' });
  }

  try {
    const artistSearchResult = await jioSaavnService.searchArtist(rawQuery);
    if (!artistSearchResult) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const artistDetails = await jioSaavnService.getArtistDetails(artistSearchResult.id);
    if (!artistDetails) {
      return res.status(404).json({ error: 'Artist details not found' });
    }

    return res.json({
      success: true,
      data: {
        albums: artistDetails.albums || [],
        videos: [],
        relatedArtists: artistDetails.biography.similarArtists || [],
        aboutStats: {
          fans: artistDetails.biography.listeners || 0,
          bio: artistDetails.biography.biography || ''
        },
        artist: {
          id: artistDetails.artist.id,
          name: artistDetails.artist.name,
          thumbnail: artistDetails.artist.image,
          image: artistDetails.artist.image,
          language: artistDetails.artist.language,
        }
      }
    });
  } catch (error) {
    console.error('Error in getArtistDetails:', error);
    return res.status(500).json({ error: 'Failed to fetch artist details' });
  }
};

exports.searchSongs = async (req, res) => {
  const { q, query } = req.query;
  const searchQuery = String(q || query || '').trim();
  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? MAX_RESULT_LIMIT : parsedLimit, 1), MAX_RESULT_LIMIT);

  if (!searchQuery || searchQuery.length < 2) {
    return res.json({
      success: true,
      source: 'jiosaavn',
      query: searchQuery,
      data: [],
      warning: `Type at least 2 characters to search.`,
    });
  }

  try {
    const songs = await jioSaavnService.searchSongs(searchQuery, limit);
    return res.json({
      success: true,
      source: 'jiosaavn',
      query: searchQuery,
      total: songs.length,
      data: songs,
    });
  } catch (error) {
    console.error('Error in searchSongs:', error.message || error);
    return res.status(500).json({ error: 'Failed to search songs' });
  }
};

exports.getTrending = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || MAX_RESULT_LIMIT, MAX_RESULT_LIMIT);
  const cacheKey = `trending::${limit}`;

  const cachedPayload = await cacheService.get(cacheKey);
  if (cachedPayload) {
    return res.json({
      ...cachedPayload,
      cached: true,
    });
  }

  try {
    const songs = await jioSaavnService.getTrendingSongs(limit);

    const payload = {
      success: true,
      source: 'jiosaavn',
      total: songs.length,
      data: songs,
    };

    // Cache trending for 6 hours
    await cacheService.set(cacheKey, payload, 6 * 60 * 60);
    return res.json(payload);
  } catch (error) {
    console.error('Error in getTrending:', error);
    return res.status(500).json({ error: 'Failed to fetch trending songs' });
  }
};

// ... Liked Songs methods ...
exports.likeSong = async (req, res) => {
  try {
    const { songId, videoId, title, artist, album, thumbnail, duration, source } = req.body;
    const normalizedSongId = String(songId || videoId || '').trim();
    const userId = req.userId;

    if (!normalizedSongId) return res.status(400).json({ error: 'Song ID is required' });
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const connection = await pool.getConnection();
    try {
      const [existing] = await connection.execute('SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?', [userId, normalizedSongId]);
      if (existing.length > 0) return res.status(400).json({ error: 'Song already liked' });

      await connection.execute(
        `INSERT INTO liked_songs (user_id, song_id, title, artist, album, thumbnail, duration, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, normalizedSongId, title || null, artist || null, album || null, thumbnail || null, duration || 0, source || 'jiosaavn']
      );
      return res.json({ success: true, message: 'Song liked successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in likeSong:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.unlikeSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.userId;

    if (!songId) return res.status(400).json({ error: 'Song ID is required' });
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute('DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?', [userId, songId]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Like not found' });
      return res.json({ success: true, message: 'Song unliked successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in unlikeSong:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getLikedSongs = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(`SELECT song_id, title, artist, album, thumbnail, duration, source, liked_at FROM liked_songs WHERE user_id = ? ORDER BY liked_at DESC`, [userId]);
      
      const mappedSongs = rows.map(r => ({
        id: r.song_id,
        videoId: null,
        title: r.title,
        artist: r.artist,
        album: r.album,
        thumbnail: r.thumbnail,
        cover: r.thumbnail,
        duration: r.duration,
        source: r.source,
        liked_at: r.liked_at
      }));

      return res.json({ success: true, data: mappedSongs, total: mappedSongs.length });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in getLikedSongs:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getArtistImage = async (req, res) => {
  const artistName = String(req.query.name || '').trim();
  if (!artistName) return res.status(400).json({ error: 'Artist name is required' });

  try {
    const artist = await jioSaavnService.searchArtist(artistName);
    if (artist && artist.image) {
      return res.json({ url: artist.image });
    }
    return res.json({ url: '' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch artist image' });
  }
};

exports.playSong = async (req, res) => {
  const { trackId } = req.params;

  if (!trackId) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  try {
    const songDetails = await jioSaavnService.getSongDetails(trackId);
    if (songDetails) {
      return res.json({
        success: true,
        videoId: null,
        file_url: songDetails.file_url,
        song: songDetails
      });
    }

    return res.status(404).json({ error: 'Playable audio not found' });
  } catch (error) {
    console.error('Error in playSong:', error);
    return res.status(500).json({ error: 'Failed to retrieve playback video' });
  }
};
exports.streamSong = async (req, res) => {
  const { trackId } = req.params;

  if (!trackId) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  try {
    const queryStreamUrl = String(req.query.url || '').trim();
    let streamUrl = isAllowedJioSaavnMediaUrl(queryStreamUrl) ? queryStreamUrl : '';

    if (!streamUrl) {
      const songDetails = await jioSaavnService.getSongDetails(trackId);
      streamUrl = songDetails?.file_url || '';
    }

    if (!streamUrl) {
      return res.status(404).json({ error: 'Playable audio not found' });
    }

    const upstreamHeaders = {
      Referer: 'https://www.jiosaavn.com/',
      Origin: 'https://www.jiosaavn.com',
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      Accept: req.headers.accept || '*/*',
    };

    if (req.headers.range) {
      upstreamHeaders.Range = req.headers.range;
    }

    const upstream = await axios.get(streamUrl, {
      responseType: 'stream',
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: upstreamHeaders,
    });

    if (upstream.status < 200 || upstream.status >= 300) {
      return res.status(upstream.status).json({ error: 'Upstream audio unavailable' });
    }

    const passthroughHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'etag',
      'last-modified',
    ];

    passthroughHeaders.forEach((header) => {
      const value = upstream.headers[header];
      if (value) res.setHeader(header, value);
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(upstream.status);
    upstream.data.pipe(res);
  } catch (error) {
    console.error('Error in streamSong:', error.message || error);
    return res.status(500).json({ error: 'Failed to stream audio' });
  }
};

exports.getArtistAlbums = async (req, res) => {
  const artistName = String(req.query.artist || req.query.name || '').trim();

  if (!artistName) {
    return res.status(400).json({ error: 'artist name is required' });
  }

  const cacheKey = `albums:${artistName.toLowerCase()}`;

  try {
    // 1. Check cache
    const cached = await cacheService.get(cacheKey);
    if (cached && req.query.nocache !== 'true') {
      return res.json({ success: true, source: 'cache', data: cached });
    }

    // 2. Fetch artist and their albums from JioSaavn
    const artist = await jioSaavnService.searchArtist(artistName);
    if (!artist) {
      return res.json({ success: true, source: 'jiosaavn', data: [] });
    }

    const artistDetails = await jioSaavnService.getArtistDetails(artist.id);
    const albums = artistDetails?.albums || [];

    // 3. Cache for 24 hours
    await cacheService.set(cacheKey, albums, 86400);

    return res.json({ success: true, source: 'jiosaavn', data: albums });
  } catch (error) {
    console.error('Error in getArtistAlbums:', error);
    return res.status(500).json({ error: 'Failed to fetch albums' });
  }
};
