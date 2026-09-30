import apiClient, { baseURL } from './client';

// --- Song Search (JioSaavn via backend) ---
export const searchSongs = (query, limit = 10) =>
  apiClient.get('/api/search', { params: { q: query, limit } });

export const searchFederated = (query, limit = 10, history = '') =>
  apiClient.get('/api/search', { params: { q: query, limit, grouped: true, history } });

export const getSearchSuggestions = () =>
  apiClient.get('/api/search/suggestions');

export const searchCategory = (category, query, limit = 12) =>
  apiClient.get('/api/search/category', { params: { category, q: query, limit } });

// --- Trending Songs ---
export const getTrending = (limit = 40) =>
  apiClient.get('/api/music/trending', { params: { limit } });

export const getTrendingArtists = (limit = 20) =>
  apiClient.get('/api/music/trending-artists', { params: { limit } });

// --- Artist Search (JioSaavn) ---
export const searchArtist = (name) =>
  apiClient.get('/api/music/artists', { params: { name } });

// --- Artist Albums (JioSaavn album cards) ---
export const getArtistAlbums = (artistName, params = {}) =>
  apiClient.get('/api/music/albums', { params: { artist: artistName, ...params } });

export const getAlbumDetails = (albumId) =>
  apiClient.get(`/api/music/albums/${encodeURIComponent(albumId)}`);

// --- Artist Details (bio, similar artists, etc.) ---
export const getArtistDetails = (name) =>
  apiClient.get('/api/music/artists/details', { params: { name } });

export const getArtistSongs = (name, page = 1, limit = 50) =>
  apiClient.get('/api/music/artists/songs', { params: { name, page, limit } });

// --- Artist Image (TheAudioDB) ---
export const getArtistImage = (name) =>
  apiClient.get('/api/music/artists/image', { params: { name } });

// --- Resolve playback video for a track ---
export const resolvePlayback = (trackId, trackName, artistName) =>
  apiClient.get(`/api/music/play/${encodeURIComponent(trackId)}`, {
    params: { trackName, artistName },
  });

// --- Liked Songs (Plural: /liked-songs) ---
export const getLikedSongs = (token) =>
  apiClient.get('/api/music/liked-songs', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const likeSong = (payload, token) =>
  apiClient.post('/api/music/liked-songs', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const unlikeSong = (songId, token) =>
  apiClient.delete(`/api/music/liked-songs/${songId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// --- Liked Albums (/liked-albums) ---
export const getLikedAlbums = (token) =>
  apiClient.get('/api/music/liked-albums', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

export const likeAlbum = (payload, token) =>
  apiClient.post('/api/music/liked-albums', payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

export const unlikeAlbum = (albumId, token) =>
  apiClient.delete(`/api/music/liked-albums/${encodeURIComponent(albumId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
export const getPlaybackStreamUrl = (trackId, sourceUrl = '') => {
  const normalizedId = String(trackId || '').trim();
  if (!normalizedId) return '';

  const params = new URLSearchParams();
  const normalizedSourceUrl = String(sourceUrl || '').trim();
  if (normalizedSourceUrl) {
    params.set('url', normalizedSourceUrl);
  }

  const query = params.toString();
  return `${String(baseURL).replace(/\/$/, '')}/api/music/stream/${encodeURIComponent(normalizedId)}${query ? `?${query}` : ''}`;
};

// --- Recommendations ---
export const fetchPopularSongs = async ({ limit = 20 } = {}) => {
  const response = await apiClient.get('/api/music/popular', { params: { limit } });
  return response.data;
};

export const fetchRecommendations = async ({ limit = 10, historyLimit = 50 } = {}, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await apiClient.get('/api/recommendations', {
    params: { limit, historyLimit },
    headers
  });
  return response.data;
};

export const fetchRecommendedArtists = async ({ limit = 10 } = {}, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await apiClient.get('/api/recommendations/artists', {
    params: { limit },
    headers
  });
  return response.data;
};

// --- Track Play Events ---
export const trackSongPlay = async (songId, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await apiClient.post('/api/music/track-play', { songId }, { headers });
  return response.data;
};

export const trackUserEvent = async (songId, eventType, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await apiClient.post('/api/music/track-event', { songId, eventType }, { headers });
  return response.data;
};
