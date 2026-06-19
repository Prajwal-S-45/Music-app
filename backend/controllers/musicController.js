const pool = require('../config/database');
const youtubeService = require('../services/youtubeService');

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const FAILED_SEARCH_CACHE_TTL_MS = 20 * 1000;
const TRENDING_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_SEARCH_CACHE_ENTRIES = 500;
const MAX_RESULT_LIMIT = 50;
const MIN_QUERY_LENGTH = 2;
const searchCache = new Map();
const inFlightSearches = new Map();
const trendingCache = new Map();
const artistsCache = new Map();
const cacheMetrics = {
  startedAt: Date.now(),
  search: {
    hits: 0,
    misses: 0,
    staleHits: 0,
    inFlightJoins: 0,
    upstreamCalls: 0,
    quotaFallbacks: 0,
    rejectedShortQueries: 0,
    errors: 0,
  },
  trending: {
    hits: 0,
    misses: 0,
    staleHits: 0,
    upstreamCalls: 0,
    errors: 0,
  },
};

const mapCatalogSong = (item) => {
  const id = item?.videoId || item?.id;
  return {
    id,
    videoId: id,
    title: item?.title || 'Untitled Track',
    artist: item?.channelTitle || 'Unknown Channel',
    channelTitle: item?.channelTitle || 'Unknown Channel',
    album: item?.album || '',
    thumbnail: item?.thumbnail || null,
    duration: Number(item?.duration) || 0,
    // Kept for old player compatibility. YouTube URLs are not directly streamable in <audio>.
    file_url: id ? `https://www.youtube.com/watch?v=${id}` : null,
    source: 'youtube',
    playable: Boolean(id),
  };
};

const normalizeLikedSongSnapshot = (body, normalizedSongId) => ({
  title: String(body.title || '').trim() || null,
  artist: String(body.artist || body.channelTitle || '').trim() || null,
  album: String(body.album || '').trim() || null,
  thumbnail: String(body.thumbnail || body.cover || body.image || '').trim() || null,
  duration: Number(body.duration) || null,
  source: String(body.source || 'youtube').trim() || 'youtube',
  songId: normalizedSongId,
});

const mapLikedRow = (row) => ({
  id: row.song_id,
  videoId: row.song_id,
  title: row.title || 'Unavailable video',
  artist: row.artist || row.channelTitle || 'Unknown Artist',
  channelTitle: row.artist || row.channelTitle || 'Unknown Artist',
  album: row.album || '',
  thumbnail: row.thumbnail || null,
  cover: row.thumbnail || null,
  duration: Number(row.duration) || 0,
  source: row.source || 'youtube',
  playable: true,
  likedAt: row.liked_at,
});

const sendYouTubeError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);

  if (error.code === 'YOUTUBE_QUOTA_EXCEEDED') {
    return res.status(429).json({
      error: 'YouTube API quota exceeded. Please try again later.',
      code: 'YOUTUBE_QUOTA_EXCEEDED',
    });
  }

  return res.status(500).json({
    error: error.message || 'Request failed',
    code: error.code || 'REQUEST_FAILED',
  });
};

const sanitizeSearchInput = (value) => {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeCacheText = (value) => sanitizeSearchInput(value).toLowerCase();

const buildSearchCacheKey = (query, limit) => `${normalizeCacheText(query)}::${Number(limit) || MAX_RESULT_LIMIT}`;

const readSearchCache = (key) => {
  const cachedEntry = searchCache.get(key);
  if (!cachedEntry) {
    return null;
  }

  const isFresh = cachedEntry.expiresAt > Date.now();
  return {
    payload: cachedEntry.payload,
    isFresh,
  };
};

const getSearchCache = (key) => {
  const entry = readSearchCache(key);
  if (!entry || !entry.isFresh) {
    return null;
  }

  return entry.payload;
};

const getStaleSearchCache = (key) => {
  const entry = readSearchCache(key);
  return entry?.payload || null;
};

const pruneSearchCache = () => {
  const now = Date.now();

  for (const [key, value] of searchCache.entries()) {
    if (value.expiresAt <= now) {
      searchCache.delete(key);
    }
  }

  if (searchCache.size <= MAX_SEARCH_CACHE_ENTRIES) {
    return;
  }

  const entriesByExpiry = Array.from(searchCache.entries())
    .sort((a, b) => a[1].expiresAt - b[1].expiresAt);

  const overflow = searchCache.size - MAX_SEARCH_CACHE_ENTRIES;
  for (let index = 0; index < overflow; index += 1) {
    searchCache.delete(entriesByExpiry[index][0]);
  }
};

const getTrendingCache = (key) => {
  const entry = trendingCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    trendingCache.delete(key);
    return null;
  }

  return entry.payload;
};

const getStaleTrendingCache = (key) => {
  const entry = trendingCache.get(key);
  return entry?.payload || null;
};

const getArtistsCache = (key) => {
  const entry = artistsCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    artistsCache.delete(key);
    return null;
  }

  return entry.payload;
};

const getStaleArtistsCache = (key) => {
  const entry = artistsCache.get(key);
  return entry?.payload || null;
};

const setArtistsCache = (key, payload, ttlMs = SEARCH_CACHE_TTL_MS) => {
  artistsCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
};

const setTrendingCache = (key, payload) => {
  trendingCache.set(key, {
    expiresAt: Date.now() + TRENDING_CACHE_TTL_MS,
    payload,
  });
};

const setSearchCache = (key, payload, ttlMs = SEARCH_CACHE_TTL_MS) => {
  pruneSearchCache();

  searchCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
};

const formatSearchResponse = ({ source, query, data, warning, cached = false, stale = false }) => ({
  success: true,
  source,
  query,
  total: Array.isArray(data) ? data.length : 0,
  data: Array.isArray(data) ? data : [],
  cached,
  stale,
  ...(warning ? { warning } : {}),
});

exports.getCacheStats = async (req, res) => {
  return res.json({
    success: true,
    cache: {
      uptimeMs: Date.now() - cacheMetrics.startedAt,
      search: {
        ...cacheMetrics.search,
        size: searchCache.size,
        inFlight: inFlightSearches.size,
        ttlMs: SEARCH_CACHE_TTL_MS,
        failedTtlMs: FAILED_SEARCH_CACHE_TTL_MS,
        maxEntries: MAX_SEARCH_CACHE_ENTRIES,
      },
      trending: {
        ...cacheMetrics.trending,
        size: trendingCache.size,
        ttlMs: TRENDING_CACHE_TTL_MS,
      },
    },
  });
};

exports.getSongs = async (req, res) => {
  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? MAX_RESULT_LIMIT : parsedLimit, 1), MAX_RESULT_LIMIT);

  try {
    const songs = await youtubeService.getTrendingSongs(limit);
    const data = Array.isArray(songs) ? songs.map(mapCatalogSong) : [];

    return res.json({
      success: true,
      source: 'youtube',
      total: data.length,
      data,
    });
  } catch (error) {
    console.error('Error in getSongs:', error);
    return res.json({
      success: true,
      source: 'youtube',
      total: 0,
      data: [],
      warning: error?.code === 'YOUTUBE_QUOTA_EXCEEDED'
        ? 'YouTube quota exceeded. Returning empty results.'
        : 'Song catalog unavailable. Returning empty results.',
    });
  }
};

exports.getArtists = async (req, res) => {
  const rawQuery = sanitizeSearchInput(req.query.q || req.query.query || '');
  const rawLanguage = sanitizeSearchInput(req.query.language || '');
  const normalizedQuery = normalizeCacheText(rawQuery);
  const normalizedLanguage = normalizeCacheText(rawLanguage);
  const pageToken = String(req.query.pageToken || '').trim();
  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? MAX_RESULT_LIMIT : parsedLimit, 1), MAX_RESULT_LIMIT);
  const cacheKey = `artists-v2::${normalizedQuery}::${normalizedLanguage}::${pageToken}::${limit}`;

  const cachedPayload = getArtistsCache(cacheKey);
  if (cachedPayload) {
    return res.json({
      ...cachedPayload,
      cached: true,
    });
  }

  try {
    const { artists, nextPageToken, source, warning } = await youtubeService.getArtists({
      query: rawQuery,
      language: rawLanguage,
      pageToken,
      limit,
    });

    const payload = {
      success: true,
      source: source || 'musicbrainz',
      query: rawQuery,
      language: rawLanguage,
      total: Array.isArray(artists) ? artists.length : 0,
      data: Array.isArray(artists) ? artists : [],
      nextPageToken,
      ...(warning ? { warning } : {}),
    };

    setArtistsCache(cacheKey, payload);
    return res.json(payload);
  } catch (error) {
    console.error('Error in getArtists:', error);
    const stalePayload = getStaleArtistsCache(cacheKey);
    if (stalePayload) {
      return res.json({
        ...stalePayload,
        cached: true,
        stale: true,
        warning: 'Serving cached artists because YouTube is unavailable.',
      });
    }

    return res.json({
      success: true,
      source: 'artist-directory',
      query: rawQuery,
      language: rawLanguage,
      total: 0,
      data: [],
      nextPageToken: '',
      warning: error?.code === 'YOUTUBE_QUOTA_EXCEEDED'
        ? 'YouTube quota exceeded. Returning empty artists list.'
        : 'Artists unavailable. Returning empty list.',
    });
  }
};

exports.searchSongs = async (req, res) => {
  const { q, query, type } = req.query;
  const searchQuery = sanitizeSearchInput(q || query || '');
  const searchTypeCandidate = normalizeCacheText(type || 'song');
  const searchType = ['song', 'artist', 'album'].includes(searchTypeCandidate) ? searchTypeCandidate : 'song';
  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? MAX_RESULT_LIMIT : parsedLimit, 1), MAX_RESULT_LIMIT);
  const cacheKey = buildSearchCacheKey(`${searchType}:${searchQuery}`, limit);

  try {
    if (!searchQuery || searchQuery.length < MIN_QUERY_LENGTH) {
      cacheMetrics.search.rejectedShortQueries += 1;
      return res.json(formatSearchResponse({
        source: 'youtube',
        query: searchQuery,
        data: [],
        warning: `Type at least ${MIN_QUERY_LENGTH} characters to search.`,
      }));
    }

    const cachedPayload = getSearchCache(cacheKey);
    if (cachedPayload) {
      cacheMetrics.search.hits += 1;
      return res.json(formatSearchResponse({ ...cachedPayload, cached: true }));
    }

    cacheMetrics.search.misses += 1;

    if (inFlightSearches.has(cacheKey)) {
      cacheMetrics.search.inFlightJoins += 1;
      const inFlightPayload = await inFlightSearches.get(cacheKey);
      return res.json(formatSearchResponse({ ...inFlightPayload, cached: true }));
    }

    const stalePayload = getStaleSearchCache(cacheKey);

    const searchPromise = (async () => {
      try {
        cacheMetrics.search.upstreamCalls += 1;
        let songs = [];
        if (searchType === 'artist') {
          songs = await youtubeService.searchArtists(searchQuery, limit);
        } else if (searchType === 'album') {
          songs = await youtubeService.searchAlbums(searchQuery, limit);
        } else {
          songs = await youtubeService.searchSongs(searchQuery, limit);
        }

        const payload = {
          source: 'youtube',
          query: searchQuery,
          data: songs,
        };
        setSearchCache(cacheKey, payload);
        return payload;
      } catch (error) {
        console.error('YouTube search failed, returning empty array:', error?.message || error);
        cacheMetrics.search.errors += 1;

        if (error?.code === 'YOUTUBE_QUOTA_EXCEEDED' && stalePayload) {
          cacheMetrics.search.staleHits += 1;
          cacheMetrics.search.quotaFallbacks += 1;
          const payload = {
            ...stalePayload,
            query: searchQuery,
            warning: 'YouTube quota exceeded. Returning cached results.',
            stale: true,
          };
          setSearchCache(cacheKey, payload, FAILED_SEARCH_CACHE_TTL_MS);
          return payload;
        }

        const payload = {
          source: 'youtube',
          query: searchQuery,
          data: [],
          warning: error?.code === 'YOUTUBE_QUOTA_EXCEEDED'
            ? 'YouTube quota exceeded. Returning empty results.'
            : 'YouTube search unavailable. Returning empty results.',
        };
        setSearchCache(cacheKey, payload, FAILED_SEARCH_CACHE_TTL_MS);
        return payload;
      }
    })();

    inFlightSearches.set(cacheKey, searchPromise);

    const payload = await searchPromise;
    return res.json(formatSearchResponse(payload));
  } catch (error) {
    return sendYouTubeError(res, error, 'searchSongs');
  } finally {
    inFlightSearches.delete(cacheKey);
  }
};

exports.getTrending = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || MAX_RESULT_LIMIT, MAX_RESULT_LIMIT);
  const cacheKey = `trending::${limit}`;

  const cachedPayload = getTrendingCache(cacheKey);
  if (cachedPayload) {
    cacheMetrics.trending.hits += 1;
    return res.json({
      ...cachedPayload,
      cached: true,
    });
  }

  cacheMetrics.trending.misses += 1;

  try {
    cacheMetrics.trending.upstreamCalls += 1;
    const songs = await youtubeService.getTrendingSongs(limit);

    const payload = {
      success: true,
      source: 'youtube',
      total: songs.length,
      data: songs,
    };

    setTrendingCache(cacheKey, payload);
    return res.json(payload);
  } catch (error) {
    console.error('Error in getTrending:', error);
    cacheMetrics.trending.errors += 1;
    const stalePayload = getStaleTrendingCache(cacheKey);
    if (stalePayload) {
      cacheMetrics.trending.staleHits += 1;
      return res.json({
        ...stalePayload,
        warning: 'Trending cache served because YouTube is unavailable.',
        stale: true,
      });
    }

    return res.json({
      success: true,
      source: 'youtube',
      total: 0,
      data: [],
      warning: error?.code === 'YOUTUBE_QUOTA_EXCEEDED'
        ? 'YouTube quota exceeded. Returning empty results.'
        : 'Trending unavailable. Returning empty results.',
    });
  }
};

exports.likeSong = async (req, res) => {
  try {
    const { songId, videoId } = req.body;
    const normalizedSongId = String(songId || videoId || '').trim();
    const snapshot = normalizeLikedSongSnapshot(req.body, normalizedSongId);
    const userId = req.userId;

    if (!normalizedSongId) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const connection = await pool.getConnection();

    try {
      const [existing] = await connection.execute(
        'SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?',
        [userId, normalizedSongId]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Song already liked' });
      }

      await connection.execute(
        `INSERT INTO liked_songs
          (user_id, song_id, title, artist, album, thumbnail, duration, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          normalizedSongId,
          snapshot.title,
          snapshot.artist,
          snapshot.album,
          snapshot.thumbnail,
          snapshot.duration,
          snapshot.source,
        ]
      );

      return res.json({
        success: true,
        message: 'Song liked successfully',
      });
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

    if (!songId) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const connection = await pool.getConnection();

    try {
      const [result] = await connection.execute('DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?', [userId, songId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Like not found' });
      }

      return res.json({
        success: true,
        message: 'Song unliked successfully',
      });
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

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT song_id, title, artist, album, thumbnail, duration, source, liked_at
         FROM liked_songs
         WHERE user_id = ?
         ORDER BY liked_at DESC`,
        [userId]
      );

      const videoIds = rows.map((row) => row.song_id);
      let detailedSongs = [];

      try {
        detailedSongs = await youtubeService.getVideosByIds(videoIds);
      } catch (error) {
        console.warn('Could not fetch full YouTube metadata for liked songs:', error.message);
      }

      const songsById = new Map(detailedSongs.map((song) => [song.id, song]));
      const likedSongs = rows.map((row) => {
        const detailedSong = songsById.get(row.song_id);
        const storedSong = mapLikedRow(row);

        return {
          ...storedSong,
          ...detailedSong,
          id: row.song_id,
          videoId: row.song_id,
          title: detailedSong?.title || storedSong.title,
          artist: detailedSong?.artist || detailedSong?.channelTitle || storedSong.artist,
          channelTitle: detailedSong?.channelTitle || detailedSong?.artist || storedSong.channelTitle,
          thumbnail: detailedSong?.thumbnail || storedSong.thumbnail,
          cover: detailedSong?.thumbnail || storedSong.cover,
          duration: Number(detailedSong?.duration) || storedSong.duration,
          likedAt: row.liked_at,
        };
      });

      return res.json({
        success: true,
        data: likedSongs,
        total: likedSongs.length,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in getLikedSongs:', error);
    return res.status(500).json({ error: error.message });
  }
};
