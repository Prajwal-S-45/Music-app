const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80';

const MOVIES = [
  { id: 'movie-kgf', type: 'movie', title: 'KGF', year: 2018, language: 'Kannada', songCount: 8, popularity: 98, trending: true, poster: FALLBACK_IMAGE, searchText: 'kgf rocky yash kannada movie soundtrack' },
  { id: 'movie-pushpa', type: 'movie', title: 'Pushpa', year: 2021, language: 'Telugu', songCount: 6, popularity: 96, trending: true, poster: FALLBACK_IMAGE, searchText: 'pushpa telugu allu arjun movie songs' },
  { id: 'movie-kantara', type: 'movie', title: 'Kantara', year: 2022, language: 'Kannada', songCount: 5, popularity: 94, trending: true, recent: true, poster: FALLBACK_IMAGE, searchText: 'kantara kannada rishab shetty varaha roopam songs' },
  { id: 'movie-bahubali', type: 'movie', title: 'Bahubali', year: 2015, language: 'Telugu', songCount: 7, popularity: 95, poster: FALLBACK_IMAGE, searchText: 'bahubali baahubali telugu prabhas movie songs' },
  { id: 'movie-brahmastra', type: 'movie', title: 'Brahmastra', year: 2022, language: 'Hindi', songCount: 9, popularity: 91, recent: true, poster: FALLBACK_IMAGE, searchText: 'brahmastra hindi kesariya deva deva movie songs' },
];

const STATIC_CATALOG = {
  albums: [
    { id: 'album-brahmastra', type: 'album', title: 'Brahmastra', year: 2022, composer: 'Pritam', language: 'Hindi', popularity: 92, cover: FALLBACK_IMAGE, navigable: false },
    { id: 'album-kantara', type: 'album', title: 'Kantara', year: 2022, composer: 'B. Ajaneesh Loknath', language: 'Kannada', popularity: 90, cover: FALLBACK_IMAGE, navigable: false },
    { id: 'album-kgf', type: 'album', title: 'KGF Chapter 1', year: 2018, composer: 'Ravi Basrur', language: 'Kannada', popularity: 95, cover: FALLBACK_IMAGE, navigable: false },
  ],
  artists: [
    { id: 'artist-arijit', type: 'artist', name: 'Arijit Singh', profession: 'Singer', aliases: ['Arijit'], popularity: 99, verified: true, navigable: false },
    { id: 'artist-pritam', type: 'artist', name: 'Pritam', profession: 'Composer', aliases: ['Pritam Chakraborty'], popularity: 94, verified: true, navigable: false },
    { id: 'artist-brahmanandam', type: 'artist', name: 'Brahmanandam', profession: 'Actor', aliases: ['Brahmi'], popularity: 87, verified: true, navigable: false },
    { id: 'artist-vijay-prakash', type: 'artist', name: 'Vijay Prakash', profession: 'Singer', aliases: [], popularity: 90, verified: true, navigable: false },
  ],
  playlists: [
    { id: 'playlist-brahma', type: 'playlist', title: 'Best Brahma Songs', description: 'Devotional and cinematic Brahma inspired tracks', creator: 'Music App', songCount: 42, tags: ['devotional', 'cinema'], popularity: 82 },
    { id: 'playlist-kannada-hits', type: 'playlist', title: 'Kannada Movie Hits', description: 'KGF, Kantara, and more', creator: 'Music App', songCount: 65, tags: ['kannada', 'movies'], popularity: 93, trending: true },
    { id: 'playlist-telugu-mass', type: 'playlist', title: 'Telugu Mass Mix', description: 'Pushpa, Bahubali, and blockbuster songs', creator: 'Music App', songCount: 58, tags: ['telugu', 'movies'], popularity: 91 },
  ],
  podcasts: [
    { id: 'podcast-brahma-vartha', type: 'podcast', title: 'Brahma Vartha', host: 'Music Stories', season: 'Season 2', description: 'Stories behind Indian film music', popularity: 76 },
    { id: 'podcast-cinema-sound', type: 'podcast', title: 'Cinema Soundtracks', host: 'Studio Talks', season: 'Season 1', description: 'Composers, singers, and movie music', popularity: 80, trending: true },
  ],
  movies: MOVIES,
};

const normalize = (value) => String(value || '').toLowerCase().trim();
const titleOf = (item) => item.title || item.name || '';

const scoreItem = (item, rawQuery, options = {}) => {
  const query = normalize(rawQuery);
  const title = normalize(titleOf(item));
  const searchable = normalize([
    item.searchText,
    item.title,
    item.name,
    item.album,
    item.artist,
    item.singer,
    item.composer,
    item.lyrics,
    item.language,
    item.description,
    item.creator,
    item.host,
    item.profession,
    item.year,
    ...(Array.isArray(item.aliases) ? item.aliases : []),
    ...(Array.isArray(item.tags) ? item.tags : []),
  ].filter(Boolean).join(' '));

  let score = 0;
  if (title === query) score += 100;
  else if (title.startsWith(query)) score += 70;
  else if (searchable.includes(query)) score += 50;
  else return 0;

  const popularity = Number(item.popularity || item.playCount || 0);
  if (popularity) score += Math.min(30, Math.round(popularity / 4));
  if (item.trending) score += 20;
  if (item.recent) score += 15;
  if (options.preferredLanguage && normalize(item.language) === normalize(options.preferredLanguage)) score += 10;
  if (options.historyTerms?.some((term) => searchable.includes(normalize(term)))) score += 15;
  if (item.verified) score += 5;

  return score;
};

const sortByScore = (items, query, options) => items
  .map((item) => ({ ...item, relevanceScore: scoreItem(item, query, options) }))
  .filter((item) => item.relevanceScore > 0)
  .sort((a, b) => b.relevanceScore - a.relevanceScore);

const songToItem = (song, index) => {
  const id = song?.id || song?.videoId || `song-${index}`;
  const artist = song?.artist || song?.channelTitle || 'Unknown Artist';
  return {
    ...song,
    id,
    videoId: song?.videoId || id,
    type: 'song',
    title: song?.title || 'Untitled Track',
    movieName: song?.movieName || song?.movie || '',
    album: song?.album || '',
    singer: artist,
    artist,
    composer: song?.composer || '',
    lyrics: song?.lyrics || '',
    language: song?.language || '',
    duration: Number(song?.duration) || 0,
    thumbnail: song?.thumbnail || song?.cover || song?.image || FALLBACK_IMAGE,
    cover: song?.cover || song?.thumbnail || song?.image || FALLBACK_IMAGE,
    popularity: song?.popularity || song?.playCount || 70,
    trending: Boolean(song?.trending),
    source: song?.source || 'jiosaavn',
  };
};

const uniqueBy = (items, getKey) => {
  const map = new Map();
  items.forEach((item) => {
    const key = normalize(getKey(item));
    if (key && !map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
};

const buildFederatedSearchPayload = (query, songs = [], options = {}) => {
  const normalizedSongs = songs.map(songToItem);
  const inferredAlbums = uniqueBy(normalizedSongs.map((song, index) => ({
    id: `album-${song.album || song.artist}-${index}`,
    type: 'album',
    title: song.album || `${song.artist} Hits`,
    year: song.year || '',
    composer: song.composer || song.artist,
    language: song.language || '',
    cover: song.cover || song.thumbnail || FALLBACK_IMAGE,
    popularity: song.popularity || 70,
    searchText: `${song.album || ''} ${song.artist || ''} ${song.title || ''}`,
    navigable: false,
  })), (item) => `${item.title}:${item.composer}`);
  const inferredArtists = uniqueBy(normalizedSongs.map((song, index) => ({
    id: `artist-${song.artist}-${index}`,
    type: 'artist',
    name: song.artist,
    profession: 'Singer',
    photo: song.cover || song.thumbnail || FALLBACK_IMAGE,
    popularity: song.popularity || 70,
    verified: true,
    navigable: false,
  })), (item) => item.name);

  const grouped = {
    songs: sortByScore(normalizedSongs, query, options),
    albums: sortByScore([...STATIC_CATALOG.albums, ...inferredAlbums], query, options),
    artists: sortByScore([...STATIC_CATALOG.artists, ...inferredArtists], query, options),
    playlists: sortByScore(STATIC_CATALOG.playlists, query, options),
    podcasts: sortByScore(STATIC_CATALOG.podcasts, query, options),
    movies: sortByScore(STATIC_CATALOG.movies, query, options),
  };

  return {
    query,
    topResults: Object.values(grouped).flat().sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3),
    ...grouped,
  };
};

module.exports = { buildFederatedSearchPayload };
