const axios = require('axios');

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

const OFFICIAL_CHANNEL_HINTS = [
  't-series',
  'sony music india',
  'zee music',
  'saregama',
  'tips official',
  'yrf',
];

const EXCLUDED_TITLE_PATTERNS = [
  'cover',
  'remix',
  'shorts',
  '#shorts',
  'reprise',
  'karaoke',
  'slowed',
  'sped up',
];

const youtubeClient = axios.create({
  baseURL: YOUTUBE_BASE_URL,
  timeout: 12000,
});

const ensureApiKey = () => {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not configured');
  }
};

const isPreferredOfficialChannel = (channelTitle) => {
  const normalizedChannel = String(channelTitle || '').toLowerCase();
  return OFFICIAL_CHANNEL_HINTS.some((hint) => normalizedChannel.includes(hint));
};

const hasExcludedPattern = (title) => {
  const normalizedTitle = String(title || '').toLowerCase();
  return EXCLUDED_TITLE_PATTERNS.some((pattern) => normalizedTitle.includes(pattern));
};

const mapSearchItem = (item) => {
  const videoId = item?.id?.videoId || item?.id;
  const snippet = item?.snippet || {};

  return {
    id: videoId,
    videoId,
    title: snippet.title || 'Untitled',
    thumbnail:
      snippet?.thumbnails?.high?.url ||
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.default?.url ||
      null,
    channelTitle: snippet.channelTitle || 'Unknown Channel',
    publishedAt: snippet.publishedAt || null,
    source: 'youtube',
    playable: Boolean(videoId),
  };
};

const sortIndianMusicPreference = (items) => {
  return items.sort((a, b) => {
    const aOfficial = isPreferredOfficialChannel(a.channelTitle);
    const bOfficial = isPreferredOfficialChannel(b.channelTitle);

    if (aOfficial !== bOfficial) {
      return aOfficial ? -1 : 1;
    }

    return String(a.title).localeCompare(String(b.title));
  });
};

const normalizeAxiosError = (error) => {
  const status = error?.response?.status;
  const reason = error?.response?.data?.error?.errors?.[0]?.reason;

  if (status === 403 && reason === 'quotaExceeded') {
    const quotaError = new Error('YouTube API quota exceeded');
    quotaError.code = 'YOUTUBE_QUOTA_EXCEEDED';
    return quotaError;
  }

  const genericError = new Error(error?.response?.data?.error?.message || error.message || 'YouTube API request failed');
  genericError.code = 'YOUTUBE_API_ERROR';
  return genericError;
};

const searchSongs = async (query, limit = 10) => {
  ensureApiKey();

  const trimmed = String(query || '').trim();
  if (!trimmed) {
    throw new Error('Search query cannot be empty');
  }

  try {
    const maxResults = Math.min(Math.max(Number(limit) || 10, 1), 25);
    const response = await youtubeClient.get('/search', {
      params: {
        key: YOUTUBE_API_KEY,
        part: 'snippet',
        type: 'video',
        maxResults,
        q: `${trimmed} official video`,
        regionCode: 'IN',
        videoEmbeddable: 'true',
        safeSearch: 'none',
      },
    });

    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    const mapped = items.map(mapSearchItem).filter((item) => item.videoId);
    const filtered = mapped.filter((item) => !hasExcludedPattern(item.title));

    return sortIndianMusicPreference(filtered);
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

const getTrendingSongs = async (limit = 10) => {
  ensureApiKey();

  try {
    const maxResults = Math.min(Math.max(Number(limit) || 10, 1), 25);
    const response = await youtubeClient.get('/videos', {
      params: {
        key: YOUTUBE_API_KEY,
        part: 'snippet',
        chart: 'mostPopular',
        regionCode: 'IN',
        videoCategoryId: '10',
        maxResults,
      },
    });

    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    const mapped = items.map(mapSearchItem).filter((item) => item.videoId);
    const filtered = mapped.filter((item) => !hasExcludedPattern(item.title));

    return sortIndianMusicPreference(filtered);
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

const getVideosByIds = async (videoIds) => {
  ensureApiKey();

  const ids = Array.from(new Set((Array.isArray(videoIds) ? videoIds : []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (ids.length === 0) {
    return [];
  }

  try {
    const response = await youtubeClient.get('/videos', {
      params: {
        key: YOUTUBE_API_KEY,
        part: 'snippet',
        id: ids.join(','),
        maxResults: Math.min(ids.length, 50),
      },
    });

    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    return items.map(mapSearchItem).filter((item) => item.videoId);
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

module.exports = {
  searchSongs,
  getTrendingSongs,
  getVideosByIds,
};
