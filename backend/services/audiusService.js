const axios = require('axios');

const AUDIOUS_APP_NAME = 'music_app';
const AUDIOUS_DISCOVERY_ENDPOINT = 'https://api.audius.co';

const audiusClient = axios.create({
  timeout: 10000,
});

const getArtworkUrl = (artwork) => {
  if (!artwork) {
    return null;
  }

  return artwork['1000x1000']
    || artwork['480x480']
    || artwork['150x150']
    || artwork['110x110']
    || null;
};

const formatAudiusTrack = (track, discoveryProvider, artworkBaseUrl) => {
  if (!track || !track.id) {
    return null;
  }

  const artworkUrl = getArtworkUrl(track.artwork);

  return {
    id: track.id,
    title: track.title || 'Untitled Track',
    artist: track.user?.name || 'Unknown Artist',
    album: track.album?.title || track.playlist_name || null,
    duration: Number(track.duration) || 0,
    cover: artworkUrl && artworkBaseUrl
      ? `${artworkBaseUrl}/api/music/artwork?url=${encodeURIComponent(artworkUrl)}`
      : null,
    streamUrl: `${discoveryProvider}/v1/tracks/${track.id}/stream?app_name=${AUDIOUS_APP_NAME}`,
    source: 'audius',
  };
};

const getDiscoveryProviders = async () => {
  const discoveryResponse = await audiusClient.get(AUDIOUS_DISCOVERY_ENDPOINT);
  const providers = Array.isArray(discoveryResponse.data?.data)
    ? discoveryResponse.data.data
    : [];

  return providers.map((provider) => String(provider).replace(/\/$/, '')).filter(Boolean);
};

const searchTracks = async (query, limit = 20, artworkBaseUrl = '') => {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  const providers = await getDiscoveryProviders();
  if (providers.length === 0) {
    throw new Error('No Audius discovery providers available');
  }

  const trimmedQuery = query.trim();
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  let lastError = null;
  for (const provider of providers) {
    try {
      const response = await audiusClient.get(`${provider}/v1/tracks/search`, {
        params: {
          query: trimmedQuery,
          app_name: AUDIOUS_APP_NAME,
          limit: safeLimit,
        },
      });

      const tracks = Array.isArray(response.data?.data) ? response.data.data : [];
      return tracks.map((track) => formatAudiusTrack(track, provider, artworkBaseUrl)).filter(Boolean);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Failed to search Audius tracks: ${lastError?.message || 'Unknown error'}`);
};

module.exports = {
  searchTracks,
  formatAudiusTrack,
};