const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80';

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
  else {
    // Give inferred/associated search results a baseline score so they are displayed
    score = 40;
  }

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
  const id = song?.id || `song-${index}`;
  const artist = song?.artist || 'Unknown Artist';
  const rawArt = song?.thumbnail || song?.cover || song?.image;
  const art = typeof rawArt === 'string' && rawArt.trim() ? rawArt.trim() : FALLBACK_IMAGE;
  return {
    ...song,
    id,
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
    thumbnail: art,
    cover: art,
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

const albumToItem = (alb, index) => {
  const id = alb?.id || `album-${index}`;
  const title = alb?.title || alb?.name || 'Untitled Album';
  const artist = alb?.artist || alb?.music || alb?.composer || 'Unknown Composer';
  return {
    ...alb,
    id,
    type: 'album',
    title,
    composer: artist,
    year: alb?.year || '',
    language: alb?.language || '',
    cover: alb?.cover || alb?.image || alb?.thumbnail || FALLBACK_IMAGE,
    popularity: Number(alb?.popularity || 70),
    searchText: `${title} ${artist}`,
    navigable: true,
  };
};

const artistToItem = (art, index) => {
  const id = art?.id || `artist-${index}`;
  const name = art?.name || art?.title || 'Unknown Artist';
  return {
    ...art,
    id,
    type: 'artist',
    name,
    profession: art?.profession || art?.role || 'Artist',
    photo: art?.photo || art?.image || art?.thumbnail || FALLBACK_IMAGE,
    popularity: Number(art?.popularity || 75),
    verified: art?.verified !== undefined ? Boolean(art.verified) : true,
    navigable: true,
  };
};

const playlistToItem = (pl, index) => {
  const id = pl?.id || `playlist-${index}`;
  const title = pl?.title || pl?.name || 'Untitled Playlist';
  return {
    ...pl,
    id,
    type: 'playlist',
    title,
    description: pl?.description || `Featuring hit tracks`,
    creator: pl?.creator || pl?.firstname || 'JioSaavn',
    songCount: Number(pl?.songCount || pl?.song_count || 12),
    cover: pl?.cover || pl?.image || pl?.thumbnail || FALLBACK_IMAGE,
    popularity: Number(pl?.popularity || 70),
    searchText: `${title} ${pl?.creator || ''}`,
    navigable: true,
  };
};

const podcastToItem = (pod, index) => {
  const id = pod?.id || `podcast-${index}`;
  const title = pod?.title || pod?.name || 'Untitled Podcast';
  const info = pod?.more_info || {};
  return {
    ...pod,
    id,
    type: 'podcast',
    title,
    host: pod?.host || pod?.artist || 'JioSaavn',
    season: info?.season_count ? `${info.season_count} Seasons` : (pod?.season || 'Show'),
    description: pod?.description || `Exclusive podcast episode.`,
    cover: pod?.cover || pod?.image || pod?.thumbnail || FALLBACK_IMAGE,
    thumbnail: pod?.thumbnail || pod?.image || pod?.cover || FALLBACK_IMAGE,
    popularity: Number(pod?.popularity || 70),
    searchText: `${title} podcast show`,
    navigable: true,
  };
};

const FALLBACK_ARTIST_IMAGE = null;

/**
 * Utility function to extract and rank related artists from federated search results
 * when direct artist endpoint yields empty or insufficient results.
 *
 * Search Results Hierarchy:
 * 1. Direct Artists endpoint results (highest priority & keeps real artist photo)
 * 2. Top Result
 * 3. Songs results (artist, singer, primary_artists, music, composer)
 * 4. Albums results (artist, composer, music)
 */
const getRelatedArtists = (searchResults = {}, rawQuery = '', options = {}) => {
  const directArtists = Array.isArray(searchResults.artists) ? searchResults.artists : [];
  const songs = Array.isArray(searchResults.songs) ? searchResults.songs : [];
  const albums = Array.isArray(searchResults.albums) ? searchResults.albums : [];
  const topResults = Array.isArray(searchResults.topResults) ? searchResults.topResults : [];

  const artistMap = new Map();
  const artistScores = new Map();

  // Helper to add or update an artist candidate
  const addCandidate = (name, artwork, baseScore = 50, isDirect = false) => {
    if (!name || typeof name !== 'string') return;
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) return;

    const normalizedKey = cleanName.toLowerCase();
    const isGeneric = ['unknown artist', 'unknown composer', 'various artists', 'jiosaavn', 'unknown'].includes(normalizedKey);
    if (isGeneric) return;

    const currentScore = artistScores.get(normalizedKey) || 0;
    artistScores.set(normalizedKey, currentScore + baseScore);

    if (!artistMap.has(normalizedKey)) {
      // Set photo to direct JioSaavn artwork or null so frontend loads real artist image via JioSaavn API.
      const photo = isDirect && artwork && !artwork.includes('unsplash.com') ? artwork : null;
      artistMap.set(normalizedKey, {
        id: `artist-${normalizedKey.replace(/\s+/g, '-')}`,
        type: 'artist',
        name: cleanName,
        title: cleanName,
        profession: 'Artist',
        role: 'Artist',
        photo,
        image: photo,
        cover: photo,
        thumbnail: photo,
        popularity: 75,
        url: `/artist/${encodeURIComponent(cleanName)}`,
        navigable: true,
        source: 'jiosaavn',
        isExtracted: !isDirect,
      });
    } else if (isDirect && artwork && artwork !== FALLBACK_IMAGE && !artwork.includes('unsplash.com')) {
      const existing = artistMap.get(normalizedKey);
      existing.photo = artwork;
      existing.image = artwork;
      existing.cover = artwork;
      existing.thumbnail = artwork;
      existing.isExtracted = false;
    }
  };

  // Helper to parse artist names from delimited strings (e.g., "Arijit Singh, Pritam & Amitabh Bhattacharya")
  const processArtistString = (str, score) => {
    if (!str || typeof str !== 'string') return;
    const names = str.split(/[,&/]| Feat\.? | Featuring | and /i);
    names.forEach((n) => addCandidate(n, null, score, false));
  };

  // 1. Direct Artists get top priority and keep their real artist profile picture
  directArtists.forEach((art, idx) => {
    const name = art.name || art.title;
    if (name) {
      const artObj = artistToItem(art, idx);
      const key = artObj.name.toLowerCase();
      artistMap.set(key, artObj);
      artistScores.set(key, 200 - idx * 10);
    }
  });

  // 2. Extract from Top Results
  topResults.forEach((item, idx) => {
    const score = 100 - idx * 10;
    const art = item.artist || item.singer || item.composer || item.name;
    if (item.type === 'artist') {
      addCandidate(item.name || item.title, item.photo || item.image, score + 50, true);
    } else {
      processArtistString(art, score);
    }
  });

  // 3. Extract from Songs
  songs.forEach((song, idx) => {
    const score = Math.max(10, 80 - idx * 5);
    processArtistString(song.artist, score);
    processArtistString(song.singer, score);
    processArtistString(song.composer, score - 10);
  });

  // 4. Extract from Albums
  albums.forEach((alb, idx) => {
    const score = Math.max(10, 60 - idx * 5);
    processArtistString(alb.artist, score);
    processArtistString(alb.composer, score);
  });

  // Combine, rank by total accumulated score, and return top 5
  return Array.from(artistMap.values())
    .map((art) => ({
      ...art,
      relevanceScore: artistScores.get(art.name.toLowerCase()) || 0,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
};

const buildFederatedSearchPayload = (query, results = {}, options = {}) => {
  const songs = Array.isArray(results.songs) ? results.songs : [];
  const albums = Array.isArray(results.albums) ? results.albums : [];
  const artists = Array.isArray(results.artists) ? results.artists : [];
  const playlists = Array.isArray(results.playlists) ? results.playlists : [];
  const podcasts = Array.isArray(results.podcasts) ? results.podcasts : [];

  const normalizedSongs = songs.map(songToItem);
  const normalizedAlbums = albums.map(albumToItem);
  const normalizedArtists = artists.map(artistToItem);
  const normalizedPlaylists = playlists.map(playlistToItem);
  const normalizedPodcasts = podcasts.map(podcastToItem);

  const inferredMovies = uniqueBy(normalizedSongs.filter(s => s.album || s.movieName).map((song, index) => ({
    id: `movie-${song.album || song.movieName}-${index}`,
    type: 'movie',
    title: song.movieName || song.album,
    year: song.year || new Date().getFullYear(),
    language: song.language || 'Hindi',
    songCount: Math.floor(Math.random() * 5) + 4,
    poster: song.cover || song.thumbnail || FALLBACK_IMAGE,
    popularity: song.popularity || 80,
    searchText: `${song.movieName || song.album} soundtrack movie`,
    navigable: true,
  })), (item) => item.title);

  const grouped = {
    songs: sortByScore(normalizedSongs, query, options),
    albums: sortByScore(normalizedAlbums, query, options),
    artists: sortByScore(normalizedArtists, query, options),
    playlists: sortByScore(normalizedPlaylists, query, options),
    podcasts: sortByScore(normalizedPodcasts, query, options),
    movies: sortByScore(inferredMovies, query, options),
  };

  const topResults = Object.values(grouped)
    .flat()
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);

  // Extract and rank related artists intelligently if direct artist search yields empty/insufficient items
  const relatedArtists = getRelatedArtists({
    artists: grouped.artists,
    songs: grouped.songs,
    albums: grouped.albums,
    topResults,
  }, query, options);

  grouped.artists = relatedArtists;

  return {
    query,
    topResults,
    ...grouped,
  };
};

module.exports = { buildFederatedSearchPayload, getRelatedArtists };
