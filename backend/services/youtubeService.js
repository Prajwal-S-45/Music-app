const axios = require('axios');

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const PRIMARY_YOUTUBE_API_KEY = String(process.env.YOUTUBE_API_KEY || '').trim();
const ROTATING_API_KEYS = String(process.env.YOUTUBE_API_KEYS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const YOUTUBE_API_KEYS = Array.from(new Set([
  ...ROTATING_API_KEYS,
  ...(PRIMARY_YOUTUBE_API_KEY ? [PRIMARY_YOUTUBE_API_KEY] : []),
]));
let activeApiKeyIndex = 0;

const TRUSTED_CHANNEL_HINTS = [
  't-series',
  'sony music india',
  'zee music company',
  'lahari music',
  'aditya music',
  'saregama',
  'tips official',
];

const BANNED_TITLE_KEYWORDS = [
  'remix',
  'cover',
  'karaoke',
  'lofi',
  'slowed',
  'reverb',
  'shorts',
  'status',
  'whatsapp status',
  'troll',
  'reaction',
  'dance',
  'live',
  'performance',
];

const MUSIC_CHANNEL_HINTS = [
  'music',
  'songs',
  'records',
  'official',
  'audio',
  'vevo',
  'films',
  'entertainment',
  'label',
  'beats',
  'channel',
];

const ALBUM_INTENT_HINTS = ['movie', 'album', 'jukebox', 'ost', 'soundtrack', 'film'];

const youtubeClient = axios.create({
  baseURL: YOUTUBE_BASE_URL,
  timeout: 12000,
});

const ensureApiKey = () => {
  if (YOUTUBE_API_KEYS.length === 0) {
    throw new Error('YOUTUBE_API_KEY is not configured');
  }
};

const isQuotaExceededError = (error) => {
  const status = error?.response?.status;
  const reason = String(error?.response?.data?.error?.errors?.[0]?.reason || '').trim();
  return status === 403 && (
    reason === 'quotaExceeded' ||
    reason === 'dailyLimitExceeded' ||
    reason === 'rateLimitExceeded'
  );
};

const getApiKeyByOffset = (offset = 0) => {
  if (YOUTUBE_API_KEYS.length === 0) {
    return '';
  }

  const nextIndex = (activeApiKeyIndex + offset) % YOUTUBE_API_KEYS.length;
  return YOUTUBE_API_KEYS[nextIndex];
};

const advanceApiKeyIndex = (offset = 1) => {
  if (YOUTUBE_API_KEYS.length === 0) {
    return;
  }

  activeApiKeyIndex = (activeApiKeyIndex + offset) % YOUTUBE_API_KEYS.length;
};

const requestWithApiKeyRotation = async (endpoint, params = {}) => {
  ensureApiKey();

  const attempts = Math.max(YOUTUBE_API_KEYS.length, 1);
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const key = getApiKeyByOffset(attempt);

    try {
      const response = await youtubeClient.get(endpoint, {
        params: {
          ...params,
          key,
        },
      });

      if (attempt > 0) {
        advanceApiKeyIndex(attempt);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (isQuotaExceededError(error) && attempt < attempts - 1) {
        continue;
      }

      throw normalizeAxiosError(error);
    }
  }

  throw normalizeAxiosError(lastError || new Error('YouTube API request failed'));
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getRelevanceLanguage = (input) => {
  return /[\u0900-\u097F]/.test(String(input || '')) ? 'hi' : 'en';
};

const detectIntent = (input, requestedType) => {
  const normalizedType = normalizeText(requestedType || 'song');
  if (normalizedType === 'artist' || normalizedType === 'album') {
    return normalizedType;
  }

  const normalizedInput = normalizeText(input);
  if (ALBUM_INTENT_HINTS.some((hint) => normalizedInput.includes(hint))) {
    return 'album';
  }

  return 'song';
};

const parseDurationToSeconds = (isoDuration) => {
  const value = String(isoDuration || '');
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return 0;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return (hours * 3600) + (minutes * 60) + seconds;
};

const buildOptimizedQuery = (input, type) => {
  const normalizedInput = String(input || '').trim();
  const normalizedType = String(type || 'song').toLowerCase();

  if (normalizedType === 'artist') {
    return `${normalizedInput} official songs`;
  }

  if (normalizedType === 'album') {
    return `${normalizedInput} full album jukebox official`;
  }

  return `${normalizedInput} official video song`;
};

const isTrustedChannel = (channelTitle) => {
  const normalizedChannel = normalizeText(channelTitle);
  return TRUSTED_CHANNEL_HINTS.some((hint) => normalizedChannel.includes(hint));
};

const hasBannedKeyword = (title) => {
  const normalizedTitle = normalizeText(title);
  return BANNED_TITLE_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword));
};

const mapSearchItem = (item) => {
  const videoId = item?.id?.videoId || item?.id;
  const snippet = item?.snippet || {};

  return {
    videoId,
    title: snippet.title || 'Untitled',
    thumbnail:
      snippet?.thumbnails?.high?.url ||
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.default?.url ||
      null,
    channelTitle: snippet.channelTitle || 'Unknown Channel',
  };
};

const normalizeAxiosError = (error) => {
  if (isQuotaExceededError(error)) {
    const quotaError = new Error('YouTube API quota exceeded');
    quotaError.code = 'YOUTUBE_QUOTA_EXCEEDED';
    return quotaError;
  }

  const genericError = new Error(error?.response?.data?.error?.message || error.message || 'YouTube API request failed');
  genericError.code = 'YOUTUBE_API_ERROR';
  return genericError;
};

const fetchDurationsByVideoIds = async (videoIds) => {
  const ids = Array.from(new Set((Array.isArray(videoIds) ? videoIds : []).filter(Boolean)));
  if (ids.length === 0) {
    return new Map();
  }

  const response = await requestWithApiKeyRotation('/videos', {
    part: 'contentDetails',
    id: ids.join(','),
    maxResults: Math.min(ids.length, 50),
  });

  const items = Array.isArray(response.data?.items) ? response.data.items : [];
  return new Map(
    items.map((item) => {
      const id = item?.id;
      const durationIso = item?.contentDetails?.duration;
      return [id, parseDurationToSeconds(durationIso)];
    })
  );
};

const fetchSearchItems = async (query, limit, relevanceLanguage) => {
  const response = await requestWithApiKeyRotation('/search', {
    part: 'snippet',
    type: 'video',
    videoCategoryId: '10',
    maxResults: limit,
    q: query,
    relevanceLanguage,
    safeSearch: 'none',
  });

  const items = Array.isArray(response.data?.items) ? response.data.items : [];
  return items.map(mapSearchItem).filter((item) => item.videoId);
};

const isMusicRelatedChannel = (channelTitle, sampleTitle) => {
  const combined = `${normalizeText(channelTitle)} ${normalizeText(sampleTitle)}`;
  return MUSIC_CHANNEL_HINTS.some((hint) => combined.includes(hint));
};

const inferLanguage = (value) => {
  const normalized = normalizeText(value);

  if (/[\u0900-\u097F]/.test(String(value || '')) || /\b(hindi|bollywood)\b/.test(normalized)) {
    return 'Hindi';
  }

  if (/\b(telugu|tollywood)\b/.test(normalized)) {
    return 'Telugu';
  }

  if (/\b(tamil|kollywood)\b/.test(normalized)) {
    return 'Tamil';
  }

  if (/\b(kannada|sandalwood)\b/.test(normalized)) {
    return 'Kannada';
  }

  if (/\b(malayalam)\b/.test(normalized)) {
    return 'Malayalam';
  }

  return 'Other';
};

const getArtists = async ({ query = '', limit = 20, pageToken = '', musicOnly = true } = {}) => {
  ensureApiKey();

  const trimmedQuery = String(query || '').trim();
  const maxResults = Math.min(Math.max(Number(limit) || 20, 1), 20);
  const relevanceLanguage = getRelevanceLanguage(trimmedQuery || 'india songs');
  const searchQuery = trimmedQuery ? `${trimmedQuery} official songs` : 'india top songs official video';

  try {
    const response = await requestWithApiKeyRotation('/search', {
      part: 'snippet',
      type: 'video',
      videoCategoryId: '10',
      maxResults: 50,
      q: searchQuery,
      relevanceLanguage,
      safeSearch: 'none',
      ...(pageToken ? { pageToken } : {}),
    });

    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    const artistsMap = new Map();

    items.forEach((item) => {
      const snippet = item?.snippet || {};
      const channelTitle = String(snippet.channelTitle || '').trim();
      const channelId = String(snippet.channelId || '').trim();
      const title = String(snippet.title || '').trim();
      const normalizedName = normalizeText(channelTitle);

      if (!normalizedName) {
        return;
      }

      if (musicOnly && !isMusicRelatedChannel(channelTitle, title)) {
        return;
      }

      const artistId = channelId || normalizedName;
      const thumbnail =
        snippet?.thumbnails?.high?.url ||
        snippet?.thumbnails?.medium?.url ||
        snippet?.thumbnails?.default?.url ||
        null;

      if (!artistsMap.has(artistId)) {
        artistsMap.set(artistId, {
          id: artistId,
          name: channelTitle,
          normalizedName,
          thumbnail,
          language: inferLanguage(`${channelTitle} ${title}`),
          frequency: 1,
        });
        return;
      }

      const current = artistsMap.get(artistId);
      current.frequency += 1;
      if (!current.thumbnail && thumbnail) {
        current.thumbnail = thumbnail;
      }
      artistsMap.set(artistId, current);
    });

    const artists = Array.from(artistsMap.values())
      .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name))
      .slice(0, maxResults)
      .map((artist) => ({
        id: artist.id,
        name: artist.name,
        thumbnail: artist.thumbnail,
        language: artist.language,
        frequency: artist.frequency,
      }));

    return {
      artists,
      nextPageToken: String(response.data?.nextPageToken || ''),
    };
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

const buildSearchVariants = (input, type) => {
  const trimmedInput = String(input || '').trim();
  const normalizedType = String(type || 'song').toLowerCase();

  const primary = buildOptimizedQuery(trimmedInput, normalizedType);
  const variants = [primary];

  if (normalizedType === 'song') {
    variants.push(
      `${trimmedInput} official video song`,
      `${trimmedInput} official song`,
      trimmedInput
    );
  } else if (normalizedType === 'artist') {
    variants.push(
      `${trimmedInput} official songs`,
      `${trimmedInput} official video song`,
      `${trimmedInput} songs`,
      trimmedInput
    );
  } else if (normalizedType === 'album') {
    variants.push(
      `${trimmedInput} full album jukebox official`,
      `${trimmedInput} jukebox official`,
      `${trimmedInput} movie songs official`,
      trimmedInput
    );
  }

  return Array.from(new Set(variants.map((value) => String(value || '').trim()).filter(Boolean))).slice(0, 2);
};

const scoreCandidate = (item, normalizedInput, inputTokens) => {
  const title = normalizeText(item.title);
  const channel = normalizeText(item.channelTitle);
  const combined = `${title} ${channel}`;

  let score = 0;

  if (normalizedInput && title.includes(normalizedInput)) {
    score += 100;
  }

  if (title.includes('official video')) {
    score += 80;
  }

  if (isTrustedChannel(item.channelTitle)) {
    score += 70;
  }

  if (normalizedInput && combined.includes(normalizedInput)) {
    score += 50;
  }

  if (hasBannedKeyword(title)) {
    score -= 100;
  }

  if (item.duration >= 120 && item.duration <= 480) {
    score += 30;
  }

  const tokenMatchCount = inputTokens.filter((token) => combined.includes(token)).length;
  score += tokenMatchCount * 12;

  if (title.includes('jukebox') || title.includes('full album')) {
    score += 40;
  }

  return score;
};

const rankSearchItems = (items, input) => {
  const normalizedInput = normalizeText(input);
  const inputTokens = normalizedInput.split(/\s+/).filter(Boolean);

  return [...items].sort((a, b) => {
    const aScore = scoreCandidate(a, normalizedInput, inputTokens);
    const bScore = scoreCandidate(b, normalizedInput, inputTokens);

    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return normalizeText(a.title).localeCompare(normalizeText(b.title));
  });
};

const searchByType = async (input, type = 'song', limit = 10) => {
  ensureApiKey();

  const trimmedInput = String(input || '').trim();
  if (!trimmedInput) {
    return [];
  }

  const intent = detectIntent(trimmedInput, type);
  const maxResults = Math.min(Math.max(Number(limit) || 10, 1), 10);
  const searchVariants = buildSearchVariants(trimmedInput, intent);
  const relevanceLanguage = getRelevanceLanguage(trimmedInput);
  const normalizedInput = normalizeText(trimmedInput);
  const normalizedTokens = normalizedInput.split(/\s+/).filter(Boolean);

  try {
    const mergedItems = [];
    const seenVideoIds = new Set();

    for (const searchQuery of searchVariants) {
      const searchItems = await fetchSearchItems(searchQuery, maxResults, relevanceLanguage);
      for (const item of searchItems) {
        if (seenVideoIds.has(item.videoId)) {
          continue;
        }

        seenVideoIds.add(item.videoId);
        mergedItems.push(item);
      }

      if (mergedItems.length >= maxResults) {
        break;
      }
    }

    const durationsById = await fetchDurationsByVideoIds(mergedItems.map((item) => item.videoId));

    const filteredItems = mergedItems
      .map((item) => ({
        ...item,
        duration: Number(durationsById.get(item.videoId) || 0),
      }))
      .filter((item) => {
        const normalizedTitle = normalizeText(item.title);
        const normalizedChannel = normalizeText(item.channelTitle);
        const combined = `${normalizedTitle} ${normalizedChannel}`;

        if (hasBannedKeyword(normalizedTitle)) {
          return false;
        }

        if (item.duration < 60) {
          return false;
        }

        if (intent === 'artist' && !combined.includes(normalizedInput)) {
          return false;
        }

        if (intent === 'album') {
          const hasAlbumSignal = normalizedTitle.includes('jukebox') || normalizedTitle.includes('full album');
          const hasMovieSignal = normalizedTokens.some((token) => combined.includes(token));
          if (!hasAlbumSignal && !hasMovieSignal) {
            return false;
          }
        }

        const candidateScore = scoreCandidate(item, normalizedInput, normalizedTokens);
        if (!isTrustedChannel(item.channelTitle) && candidateScore < 140) {
          return false;
        }

        return true;
      });

    const rankedItems = rankSearchItems(filteredItems, trimmedInput);
    return rankedItems.slice(0, maxResults).map((item) => ({
      videoId: item.videoId,
      title: item.title,
      thumbnail: item.thumbnail,
      channelTitle: item.channelTitle,
      duration: item.duration,
    }));
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

const searchSongs = async (query, limit = 10) => {
  return searchByType(query, 'song', limit);
};

const searchArtists = async (artistName, limit = 10) => {
  return searchByType(artistName, 'artist', limit);
};

const searchAlbums = async (albumName, limit = 10) => {
  return searchByType(albumName, 'album', limit);
};

const getTrendingSongs = async (limit = 10) => {
  ensureApiKey();

  try {
    const maxResults = Math.min(Math.max(Number(limit) || 10, 1), 10);
    const rawItems = await fetchSearchItems('india top songs official video', maxResults, 'hi');
    const durationsById = await fetchDurationsByVideoIds(rawItems.map((item) => item.videoId));

    return rawItems
      .map((item) => ({
        ...item,
        duration: Number(durationsById.get(item.videoId) || 0),
      }))
      .filter((item) => item.duration >= 60 && !hasBannedKeyword(item.title))
      .map((item) => ({
        videoId: item.videoId,
        title: item.title,
        thumbnail: item.thumbnail,
        channelTitle: item.channelTitle,
        duration: item.duration,
      }));
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

const mapVideoItemForLibrary = (item) => {
  const videoId = item?.id;
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
    source: 'youtube',
    playable: Boolean(videoId),
  };
};

const getVideosByIds = async (videoIds) => {
  ensureApiKey();

  const ids = Array.from(new Set((Array.isArray(videoIds) ? videoIds : []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (ids.length === 0) {
    return [];
  }

  try {
    const response = await requestWithApiKeyRotation('/videos', {
      part: 'snippet',
      id: ids.join(','),
      maxResults: Math.min(ids.length, 50),
    });

    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    return items.map(mapVideoItemForLibrary).filter((item) => item.videoId);
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

module.exports = {
  searchSongs,
  searchArtists,
  searchAlbums,
  getArtists,
  getTrendingSongs,
  getVideosByIds,
};
