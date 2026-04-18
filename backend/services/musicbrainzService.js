const axios = require('axios');

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const MUSICBRAINZ_USER_AGENT = process.env.MUSICBRAINZ_USER_AGENT || 'MusicApp/1.0 ( https://github.com/example )';

const musicbrainzClient = axios.create({
  baseURL: MUSICBRAINZ_BASE_URL,
  timeout: 12000,
  headers: {
    'User-Agent': MUSICBRAINZ_USER_AGENT,
    Accept: 'application/json',
  },
});

const getPrimaryArtist = (artistCredit) => {
  if (!Array.isArray(artistCredit) || artistCredit.length === 0) {
    return 'Unknown Artist';
  }

  const first = artistCredit[0];
  if (first?.name) {
    return first.name;
  }

  return first?.artist?.name || 'Unknown Artist';
};

const getPrimaryRelease = (releases) => {
  if (!Array.isArray(releases) || releases.length === 0) {
    return null;
  }

  return releases[0];
};

const formatMusicbrainzRecording = (recording) => {
  const release = getPrimaryRelease(recording.releases);
  const durationMs = Number(recording.length) || 0;

  return {
    id: recording.id,
    title: recording.title || 'Unknown Title',
    artist: getPrimaryArtist(recording['artist-credit']),
    album: release?.title || null,
    duration: durationMs > 0 ? Math.round(durationMs / 1000) : 0,
    release_date: release?.date || null,
    score: Number(recording.score) || 0,
    source: 'musicbrainz',
  };
};

const searchRecordings = async (query, limit = 25) => {
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    throw new Error('Search query cannot be empty');
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);

  const response = await musicbrainzClient.get('/recording', {
    params: {
      query: trimmed,
      limit: safeLimit,
      fmt: 'json',
    },
  });

  const recordings = Array.isArray(response.data?.recordings)
    ? response.data.recordings
    : [];

  return recordings.map(formatMusicbrainzRecording);
};

module.exports = {
  searchRecordings,
};