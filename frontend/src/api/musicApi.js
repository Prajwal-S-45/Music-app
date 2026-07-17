import apiClient, { baseURL } from './client';

// --- Song Search (JioSaavn via backend) ---
export const searchSongs = (query, limit = 10) =>
  apiClient.get('/api/search', { params: { q: query, limit } });

// --- Trending Songs ---
export const getTrending = (limit = 40) =>
  apiClient.get('/api/music/trending', { params: { limit } });

// --- Artist Search (JioSaavn) ---
export const searchArtist = (name) =>
  apiClient.get('/api/music/artists', { params: { name } });

// --- Artist Albums (JioSaavn album cards) ---
export const getArtistAlbums = (artistName, params = {}) =>
  apiClient.get('/api/music/albums', { params: { artist: artistName, ...params } });

// --- Artist Details (bio, similar artists, etc.) ---
export const getArtistDetails = (name) =>
  apiClient.get('/api/music/artist-details', { params: { name } });

// --- Artist Image (TheAudioDB) ---
export const getArtistImage = (name) =>
  apiClient.get('/api/music/artist-image', { params: { name } });

// --- Resolve playback video for a track ---
export const resolvePlayback = (trackId, trackName, artistName) =>
  apiClient.get(`/api/music/play/${encodeURIComponent(trackId)}`, {
    params: { trackName, artistName },
  });

// --- Liked Songs ---
export const getLikedSongs = (token) =>
  apiClient.get('/api/music/liked', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const likeSong = (payload, token) =>
  apiClient.post('/api/music/like', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const unlikeSong = (songId, token) =>
  apiClient.delete(`/api/music/like/${songId}`, {
    headers: { Authorization: `Bearer ${token}` },
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