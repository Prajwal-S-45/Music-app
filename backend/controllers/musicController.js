const axios = require('axios');
const pool = require('../config/database');
const cacheService = require('../services/CacheService');
const jioSaavnService = require('../services/JioSaavnService');
const { buildFederatedSearchPayload } = require('../services/FederatedSearchService');

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
  { name: 'Arijit Singh', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg' },
  { name: 'Shreya Ghoshal', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20230613093910_500x500.jpg' },
  { name: 'Sonu Nigam', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Sonu_Nigam_500x500.jpg' },
  { name: 'Jubin Nautiyal', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Jubin_Nautiyal_002_20200810072049_500x500.jpg' },
  { name: 'Neha Kakkar', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Neha_Kakkar_006_20200825120756_500x500.jpg' },
  { name: 'Atif Aslam', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Atif_Aslam_500x500.jpg' },
  { name: 'Kumar Sanu', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Kumar_Sanu_500x500.jpg' },
  { name: 'Lata Mangeshkar', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Lata_Mangeshkar_500x500.jpg' },
  { name: 'Kishore Kumar', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Kishore_Kumar_500x500.jpg' },
  { name: 'Mohammed Rafi', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Mohammed_Rafi_500x500.jpg' },
  { name: 'Rahat Fateh Ali Khan', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Rahat_Fateh_Ali_Khan_500x500.jpg' },
  { name: 'Armaan Malik', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Armaan_Malik_003_20220204124021_500x500.jpg' },
  { name: 'Pritam', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Pritam_003_20230324083313_500x500.jpg' },
  { name: 'A.R. Rahman', language: 'Tamil', image: 'https://c.saavncdn.com/artists/A_R_Rahman_002_20210520101511_500x500.jpg' },
  { name: 'S.P. Balasubrahmanyam', language: 'Telugu', image: 'https://c.saavncdn.com/artists/S_P_Balasubrahmanyam_500x500.jpg' },
  { name: 'Sid Sriram', language: 'Tamil', image: 'https://c.saavncdn.com/artists/Sid_Sriram_003_20230508064619_500x500.jpg' },
  { name: 'Anirudh Ravichander', language: 'Tamil', image: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20230809072935_500x500.jpg' },
  { name: 'Vijay Prakash', language: 'Kannada', image: 'https://c.saavncdn.com/artists/Vijay_Prakash_500x500.jpg' },
  { name: 'K.J. Yesudas', language: 'Malayalam', image: 'https://c.saavncdn.com/artists/K_J_Yesudas_500x500.jpg' },
  { name: 'K.S. Chitra', language: 'Tamil', image: 'https://c.saavncdn.com/artists/K_S_Chithra_500x500.jpg' },
  { name: 'R.D. Burman', language: 'Hindi', image: 'https://c.saavncdn.com/artists/R_D_Burman_500x500.jpg' },
  { name: 'Udit Narayan', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Udit_Narayan_500x500.jpg' },
  { name: 'Asha Bhosle', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Asha_Bhosle_500x500.jpg' },
  { name: 'Alka Yagnik', language: 'Hindi', image: 'https://c.saavncdn.com/artists/Alka_Yagnik_500x500.jpg' },
  // Global Artists
  { name: 'Adele', language: 'English', image: 'https://c.saavncdn.com/artists/Adele_500x500.jpg' },
  { name: 'Taylor Swift', language: 'English', image: 'https://c.saavncdn.com/artists/Taylor_Swift_500x500.jpg' },
  { name: 'Ed Sheeran', language: 'English', image: 'https://c.saavncdn.com/artists/Ed_Sheeran_500x500.jpg' },
  { name: 'The Weeknd', language: 'English', image: 'https://c.saavncdn.com/artists/The_Weeknd_500x500.jpg' },
  { name: 'Dua Lipa', language: 'English', image: 'https://c.saavncdn.com/artists/Dua_Lipa_500x500.jpg' },
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

const catalogImageCache = new Map();

const ARTIST_DISCOVERY_SEEDS = [
  'Arijit', 'Singh', 'Kumar', 'Sharma', 'Punjabi', 'Tamil', 'Telugu',
  'Khan', 'Rahman', 'Badshah', 'Malayalam', 'Kannada', 'Pop', 'English',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
];

const ARTIST_IMAGE_CATALOG = {
  'arijit singh': 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg',
  'shreya ghoshal': 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20230613093910_500x500.jpg',
  'sonu nigam': 'https://c.saavncdn.com/artists/Sonu_Nigam_500x500.jpg',
  'jubin nautiyal': 'https://c.saavncdn.com/artists/Jubin_Nautiyal_002_20200810072049_500x500.jpg',
  'neha kakkar': 'https://c.saavncdn.com/artists/Neha_Kakkar_006_20200825120756_500x500.jpg',
  'atif aslam': 'https://c.saavncdn.com/artists/Atif_Aslam_500x500.jpg',
  'muhammad atif aslam': 'https://c.saavncdn.com/artists/Atif_Aslam_500x500.jpg',
  'kumar sanu': 'https://c.saavncdn.com/artists/Kumar_Sanu_500x500.jpg',
  'lata mangeshkar': 'https://c.saavncdn.com/artists/Lata_Mangeshkar_500x500.jpg',
  'kishore kumar': 'https://c.saavncdn.com/artists/Kishore_Kumar_500x500.jpg',
  'mohammed rafi': 'https://c.saavncdn.com/artists/Mohammed_Rafi_500x500.jpg',
  'rahat fateh ali khan': 'https://c.saavncdn.com/artists/Rahat_Fateh_Ali_Khan_500x500.jpg',
  'armaan malik': 'https://c.saavncdn.com/artists/Armaan_Malik_003_20220204124021_500x500.jpg',
  'pritam': 'https://c.saavncdn.com/artists/Pritam_003_20230324083313_500x500.jpg',
  'a.r. rahman': 'https://c.saavncdn.com/artists/A_R_Rahman_002_20210520101511_500x500.jpg',
  's.p. balasubrahmanyam': 'https://c.saavncdn.com/artists/S_P_Balasubrahmanyam_500x500.jpg',
  'sid sriram': 'https://c.saavncdn.com/artists/Sid_Sriram_003_20230508064619_500x500.jpg',
  'anirudh ravichander': 'https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20230809072935_500x500.jpg',
  'vijay prakash': 'https://c.saavncdn.com/artists/Vijay_Prakash_500x500.jpg',
  'k.j. yesudas': 'https://c.saavncdn.com/artists/K_J_Yesudas_500x500.jpg',
  'k.s. chitra': 'https://c.saavncdn.com/artists/K_S_Chithra_500x500.jpg',
  'k. s. chithra': 'https://c.saavncdn.com/artists/K_S_Chithra_500x500.jpg',
  'r.d. burman': 'https://c.saavncdn.com/artists/R_D_Burman_500x500.jpg',
  'udit narayan': 'https://c.saavncdn.com/artists/Udit_Narayan_500x500.jpg',
  'asha bhosle': 'https://c.saavncdn.com/artists/Asha_Bhosle_500x500.jpg',
  'alka yagnik': 'https://c.saavncdn.com/artists/Alka_Yagnik_500x500.jpg',
  'imagine dragons': 'https://c.saavncdn.com/artists/Imagine_Dragons_500x500.jpg',
  'justin bieber': 'https://c.saavncdn.com/artists/Justin_Bieber_500x500.jpg',
  'glass animals': 'https://c.saavncdn.com/artists/Glass_Animals_500x500.jpg',
  'shawn mendes': 'https://c.saavncdn.com/artists/Shawn_Mendes_500x500.jpg',
  'kk': 'https://c.saavncdn.com/artists/KK_500x500.jpg',
  'ellie goulding': 'https://c.saavncdn.com/artists/Ellie_Goulding_500x500.jpg',
  'camila cabello': 'https://c.saavncdn.com/artists/Camila_Cabello_500x500.jpg',
  'dj snake': 'https://c.saavncdn.com/artists/DJ_Snake_500x500.jpg',
  'amitabh bhattacharya': 'https://c.saavncdn.com/artists/Amitabh_Bhattacharya_500x500.jpg',
  'hariharan': 'https://c.saavncdn.com/artists/Hariharan_500x500.jpg',
  'sayeed quadri': 'https://c.saavncdn.com/artists/Sayeed_Quadri_500x500.jpg',
  'shah rukh khan': 'https://c.saavncdn.com/artists/Shah_Rukh_Khan_500x500.jpg',
  'mithoon': 'https://c.saavncdn.com/artists/Mithoon_500x500.jpg',
  'sean paul': 'https://c.saavncdn.com/artists/Sean_Paul_500x500.jpg',
  'dharmendra': 'https://c.saavncdn.com/artists/Dharmendra_500x500.jpg',
  'anand bakshi': 'https://c.saavncdn.com/artists/Anand_Bakshi_500x500.jpg',
  'kumaar': 'https://c.saavncdn.com/artists/Kumaar_500x500.jpg',
  'adele': 'https://c.saavncdn.com/artists/Adele_500x500.jpg',
  'taylor swift': 'https://c.saavncdn.com/artists/Taylor_Swift_500x500.jpg',
  'ed sheeran': 'https://c.saavncdn.com/artists/Ed_Sheeran_500x500.jpg',
  'the weeknd': 'https://c.saavncdn.com/artists/The_Weeknd_500x500.jpg',
  'dua lipa': 'https://c.saavncdn.com/artists/Dua_Lipa_500x500.jpg',
};

const resolveArtistImage = (name, img) => {
  const norm = String(name || '').toLowerCase().trim();
  if (ARTIST_IMAGE_CATALOG[norm]) return ARTIST_IMAGE_CATALOG[norm];
  if (img && typeof img === 'string' && img.startsWith('http') && !img.includes('placeholder') && !img.includes('artist-default') && !img.includes('unsplash.com')) return img;
  return img || null;
};

exports.getArtists = async (req, res) => {
  const rawQuery = String(req.query.q || req.query.query || req.query.name || '').trim();
  const languageFilter = String(req.query.language || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 50);
  const page = Math.max(parseInt(req.query.page || req.query.pageToken, 10) || 1, 1);

  // If a search query is passed, run search directly
  if (rawQuery) {
    try {
      const searchRes = await jioSaavnService.searchArtistsCategory(rawQuery, page, limit);
      let results = searchRes?.results || [];

      results = results.map(art => ({
        ...art,
        image: resolveArtistImage(art.name, art.image),
        thumbnail: resolveArtistImage(art.name, art.image),
      }));

      if (results.length === 0) {
        const lowerQ = rawQuery.toLowerCase();
        const catalogMatches = POPULAR_ARTISTS_CATALOG.filter(a => a.name.toLowerCase().includes(lowerQ));
        results = catalogMatches.map((a, i) => ({
          id: `catalog-${i}-${a.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: a.name,
          language: a.language,
          type: 'artist',
          image: resolveArtistImage(a.name, a.image),
          thumbnail: resolveArtistImage(a.name, a.image),
          source: 'catalog',
        }));
      }

      const total = searchRes?.total || results.length;
      const nextPageToken = (results.length > 0) ? String(page + 1) : null;

      return res.json({
        success: true,
        source: results[0]?.source || 'jiosaavn',
        query: rawQuery,
        page,
        limit,
        total: Math.max(total, page * limit + 10),
        nextPageToken,
        data: results,
      });
    } catch (error) {
      console.error('Error in getArtists search:', error);
      return res.status(500).json({ error: 'Failed to search artists' });
    }
  }

  // No search query = Continuous Dynamic Artist Browsing with Unlimited Infinite Scroll
  try {
    let results = [];

    if (page === 1) {
      // Page 1: Curated popular catalog + top JioSaavn discovery
      let catalog = [...POPULAR_ARTISTS_CATALOG];
      if (languageFilter) {
        catalog = catalog.filter(a => a.language.toLowerCase() === languageFilter.toLowerCase());
      }

      // Fetch JioSaavn top artists to enrich page 1
      const initialTerm = languageFilter || 'Top Artists';
      const liveRes = await jioSaavnService.searchArtistsCategory(initialTerm, 1, limit);
      const liveArtists = liveRes?.results || [];

      // Combine catalog + live results without duplicates
      const seen = new Set();
      const combined = [];

      catalog.forEach((a, i) => {
        const key = a.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          const imgSrc = resolveArtistImage(a.name, a.image);
          combined.push({
            id: `catalog-${i}-${key.replace(/\s+/g, '-')}`,
            name: a.name,
            language: a.language,
            image: imgSrc,
            thumbnail: imgSrc,
            source: 'catalog',
          });
        }
      });

      liveArtists.forEach((a) => {
        const key = a.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          const imgSrc = resolveArtistImage(a.name, a.image);
          combined.push({
            ...a,
            image: imgSrc,
            thumbnail: imgSrc,
          });
        }
      });

      results = combined.slice(0, limit);
    } else {
      // Page > 1: Dynamically query JioSaavn seed categories for unlimited singers!
      let searchTerm = languageFilter;
      let subPage = page;

      if (!languageFilter) {
        const seedIndex = (page - 2) % ARTIST_DISCOVERY_SEEDS.length;
        searchTerm = ARTIST_DISCOVERY_SEEDS[seedIndex];
        subPage = Math.floor((page - 2) / ARTIST_DISCOVERY_SEEDS.length) + 1;
      }

      const discoveryRes = await jioSaavnService.searchArtistsCategory(searchTerm, subPage, limit);
      const rawDiscovery = discoveryRes?.results || [];

      results = rawDiscovery.map(art => ({
        ...art,
        image: resolveArtistImage(art.name, art.image),
        thumbnail: resolveArtistImage(art.name, art.image),
      }));

      // Fallback if specific seed returns empty
      if (results.length === 0) {
        const fallbackTerm = ARTIST_DISCOVERY_SEEDS[page % ARTIST_DISCOVERY_SEEDS.length];
        const fallbackRes = await jioSaavnService.searchArtistsCategory(fallbackTerm, 1, limit);
        const rawFallback = fallbackRes?.results || [];
        results = rawFallback.map(art => ({
          ...art,
          image: resolveArtistImage(art.name, art.image),
          thumbnail: resolveArtistImage(art.name, art.image),
        }));
      }
    }

    return res.json({
      success: true,
      source: 'jiosaavn_discovery',
      page,
      limit,
      total: (page + 10) * limit,
      nextPageToken: String(page + 1),
      data: results,
    });
  } catch (error) {
    console.error('Error in getArtists discovery:', error);
    return res.status(500).json({ error: 'Failed to fetch artists catalog' });
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
        songs: (artistDetails.songs || []).map(s => ({
          ...s,
          cover: s.thumbnail || s.cover,
          source: 'jiosaavn',
          playable: Boolean(s.id),
        })),
        albums: artistDetails.albums || [],
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

exports.getArtistSongs = async (req, res) => {
  const artistName = String(req.query.artist || req.query.name || req.query.q || '').trim();
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;

  if (!artistName) {
    return res.status(400).json({ error: 'Artist name is required' });
  }

  try {
    const songData = await jioSaavnService.getArtistMoreSongs(artistName, page, limit);
    return res.json({
      success: true,
      page,
      limit,
      total: songData.total,
      data: songData.results || [],
    });
  } catch (error) {
    console.error('Error in getArtistSongs:', error);
    return res.status(500).json({ error: 'Failed to fetch artist songs' });
  }
};

exports.searchSongs = async (req, res) => {
  const { q, query } = req.query;
  const searchQuery = String(q || query || '').trim();
  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? MAX_RESULT_LIMIT : parsedLimit, 1), MAX_RESULT_LIMIT);
  const wantsGrouped = String(req.query.grouped || '').toLowerCase() === 'true';

  if (!searchQuery || searchQuery.length < 2) {
    return res.json({
      success: true,
      source: wantsGrouped ? 'federated' : 'jiosaavn',
      query: searchQuery,
      data: wantsGrouped
        ? {
          query: searchQuery,
          topResults: [],
          songs: [],
          albums: [],
          artists: [],
          playlists: [],
          podcasts: [],
          movies: [],
        }
        : [],
      warning: `Type at least 2 characters to search.`,
    });
  }

  const cacheKey = `search::grouped::${limit}::${searchQuery.toLowerCase()}`;

  try {
    if (wantsGrouped) {
      // Check cache first
      const cachedPayload = await cacheService.get(cacheKey);
      if (cachedPayload) {
        return res.json({
          ...cachedPayload,
          cached: true,
        });
      }

      // Query all resources in parallel
      const [songsRes, albumsRes, artistsRes, playlistsRes, autocompleteRes] = await Promise.allSettled([
        jioSaavnService.searchSongs(searchQuery, limit),
        jioSaavnService.searchAlbums(searchQuery, limit),
        jioSaavnService.searchArtists(searchQuery, limit),
        jioSaavnService.searchPlaylists(searchQuery, limit),
        jioSaavnService.getAutocomplete(searchQuery),
      ]);

      const songs = songsRes.status === 'fulfilled' ? songsRes.value : [];
      const albums = albumsRes.status === 'fulfilled' ? albumsRes.value : [];
      const artists = artistsRes.status === 'fulfilled' ? artistsRes.value : [];
      const playlists = playlistsRes.status === 'fulfilled' ? playlistsRes.value : [];
      let podcasts = [];

      if (autocompleteRes.status === 'fulfilled' && autocompleteRes.value) {
        const rawShows = autocompleteRes.value.shows?.data || [];
        podcasts = rawShows.map(show => ({
          id: show.id,
          title: show.title || show.name,
          image: show.image,
          more_info: show.more_info,
        }));
      }

      const preferredLanguage = String(req.query.language || '').trim();
      const historyTerms = String(req.query.history || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8);

      const groupedPayload = buildFederatedSearchPayload(searchQuery, {
        songs,
        albums,
        artists,
        playlists,
        podcasts,
      }, {
        preferredLanguage,
        historyTerms,
      });

      const payload = {
        success: true,
        source: 'federated',
        query: searchQuery,
        total: Object.entries(groupedPayload)
          .filter(([key, value]) => key !== 'topResults' && Array.isArray(value))
          .reduce((sum, [, items]) => sum + items.length, 0),
        data: groupedPayload,
      };

      // Cache grouped results for 5 minutes
      await cacheService.set(cacheKey, payload, 300);

      return res.json(payload);
    }

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

exports.getSearchSuggestions = async (req, res) => {
  try {
    const trending = ['Saiyaara', 'Aaj Ki Raat', 'Finding Her', 'Kesariya', 'Tauba Tauba', 'Tum Hi Ho'];
    const popularArtists = ['Arijit Singh', 'Pritam', 'Shreya Ghoshal', 'Amit Trivedi', 'Jubin Nautiyal', 'Diljit Dosanjh'];
    return res.json({
      success: true,
      data: {
        trending,
        popularArtists,
      },
    });
  } catch (error) {
    console.error('Error in getSearchSuggestions:', error);
    return res.status(500).json({ error: 'Failed to fetch search suggestions' });
  }
};

exports.searchByCategory = async (req, res) => {
  const categoryParam = String(req.params.category || req.query.category || 'songs').toLowerCase().trim();
  const searchQuery = String(req.query.q || req.query.query || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const sort = String(req.query.sort || 'relevance').toLowerCase().trim();

  const VALID_CATEGORIES = ['songs', 'albums', 'artists', 'playlists', 'podcasts', 'movies'];
  const category = VALID_CATEGORIES.includes(categoryParam) ? categoryParam : 'songs';

  if (!searchQuery || searchQuery.length < 2) {
    return res.json({
      success: true,
      category,
      query: searchQuery,
      page,
      limit,
      total: 0,
      totalPages: 1,
      hasMore: false,
      data: [],
      warning: 'Type at least 2 characters to search.',
    });
  }

  const cacheKey = `search::cat::${category}::p${page}::l${limit}::s${sort}::${searchQuery.toLowerCase()}`;

  try {
    const cachedPayload = await cacheService.get(cacheKey);
    if (cachedPayload) {
      return res.json({ ...cachedPayload, cached: true });
    }

    let searchRes = { total: 0, page, limit, results: [] };

    switch (category) {
      case 'songs':
        searchRes = await jioSaavnService.searchSongsCategory(searchQuery, page, limit);
        break;
      case 'albums':
        searchRes = await jioSaavnService.searchAlbumsCategory(searchQuery, page, limit);
        break;
      case 'artists':
        searchRes = await jioSaavnService.searchArtistsCategory(searchQuery, page, limit);
        break;
      case 'playlists':
        searchRes = await jioSaavnService.searchPlaylistsCategory(searchQuery, page, limit);
        break;
      case 'podcasts':
        searchRes = await jioSaavnService.searchPodcastsCategory(searchQuery, page, limit);
        break;
      case 'movies':
        searchRes = await jioSaavnService.searchMoviesCategory(searchQuery, page, limit);
        break;
      default:
        searchRes = await jioSaavnService.searchSongsCategory(searchQuery, page, limit);
    }

    let items = searchRes.results || [];

    // Optional Sorting
    if (sort === 'name' || sort === 'title') {
      items.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    } else if (sort === 'year') {
      items.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'popularity') {
      items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    const total = searchRes.total || items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMore = page < totalPages || items.length === limit;

    const payload = {
      success: true,
      category,
      query: searchQuery,
      page,
      limit,
      total,
      totalPages,
      hasMore,
      data: items,
    };

    await cacheService.set(cacheKey, payload, 300);
    return res.json(payload);
  } catch (error) {
    console.error(`Error in searchByCategory (${category}):`, error.message || error);
    return res.status(500).json({ error: `Failed to search ${category}` });
  }
};

exports.getTrending = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || MAX_RESULT_LIMIT, MAX_RESULT_LIMIT);
  const language = String(req.query.language || '').toLowerCase().trim();
  const cacheKey = `trending::${limit}::${language || 'default'}`;

  const cachedPayload = await cacheService.get(cacheKey);
  if (cachedPayload) {
    return res.json({
      ...cachedPayload,
      cached: true,
    });
  }

  try {
    const songs = await jioSaavnService.getTrendingSongs(limit, language);

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

exports.getTrendingArtists = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), MAX_RESULT_LIMIT);
  const cacheKey = `trending::artists::${limit}`;

  try {
    const cachedPayload = await cacheService.get(cacheKey);
    if (cachedPayload && req.query.nocache !== 'true') {
      return res.json({
        ...cachedPayload,
        cached: true,
      });
    }

    const artistScores = new Map();
    const artistMetadata = new Map();

    // 1. Gather scores from DB (liked_songs)
    try {
      const [likedRows] = await pool.query(
        `SELECT artist, COUNT(*) as cnt
         FROM liked_songs
         WHERE artist IS NOT NULL AND TRIM(artist) != ''
         GROUP BY artist
         ORDER BY cnt DESC
         LIMIT 50`
      );

      for (const row of likedRows) {
        const rawArtist = String(row.artist || '').trim();
        if (!rawArtist) continue;

        const names = rawArtist.split(/[,&/]| Feat\.? | Featuring | and /i);
        for (const name of names) {
          const cleanName = name.trim();
          if (!cleanName || cleanName.length < 2 || /^unknown artist$/i.test(cleanName)) continue;
          const key = cleanName.toLowerCase();
          const current = artistScores.get(key) || 0;
          artistScores.set(key, current + (Number(row.cnt) * 3));
          if (!artistMetadata.has(key)) {
            artistMetadata.set(key, { name: cleanName });
          }
        }
      }
    } catch (err) {
      console.warn('getTrendingArtists DB liked_songs query failed:', err.message);
    }

    // 2. Gather scores from DB (history_items)
    try {
      const [historyRows] = await pool.query(
        `SELECT title, subtitle, type, COUNT(*) as cnt
         FROM history_items
         WHERE type IN ('artist', 'song')
         GROUP BY title, subtitle, type
         ORDER BY cnt DESC
         LIMIT 50`
      );

      for (const row of historyRows) {
        let artistName = '';
        if (row.type === 'artist') {
          artistName = row.title;
        } else if (row.subtitle) {
          artistName = row.subtitle.split('•')[0].trim();
        }

        if (!artistName) continue;
        const names = artistName.split(/[,&/]| Feat\.? | Featuring | and /i);
        for (const name of names) {
          const cleanName = name.trim();
          if (!cleanName || cleanName.length < 2 || /^unknown artist$/i.test(cleanName)) continue;
          const key = cleanName.toLowerCase();
          const current = artistScores.get(key) || 0;
          artistScores.set(key, current + Number(row.cnt));
          if (!artistMetadata.has(key)) {
            artistMetadata.set(key, { name: cleanName });
          }
        }
      }
    } catch (err) {
      console.warn('getTrendingArtists DB history_items query failed:', err.message);
    }

    // 3. Merge with POPULAR_ARTISTS_CATALOG to ensure rich results
    POPULAR_ARTISTS_CATALOG.forEach((cat, index) => {
      const key = cat.name.toLowerCase();
      const baseScore = 50 - index;
      const current = artistScores.get(key) || 0;
      artistScores.set(key, current + baseScore);
      if (!artistMetadata.has(key)) {
        artistMetadata.set(key, { name: cat.name, language: cat.language });
      } else if (cat.language) {
        artistMetadata.get(key).language = cat.language;
      }
    });

    // 4. Sort candidates by score and take top (limit)
    const sortedCandidates = Array.from(artistMetadata.entries())
      .map(([key, meta]) => ({
        key,
        name: meta.name,
        language: meta.language || '',
        score: artistScores.get(key) || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // 5. Hydrate images & JioSaavn IDs in parallel
    const hydratedData = await Promise.all(
      sortedCandidates.map(async (candidate, index) => {
        try {
          const artist = await jioSaavnService.searchArtist(candidate.name);
          return {
            id: artist?.id || `trending-${index}-${candidate.key.replace(/\s+/g, '-')}`,
            name: artist?.name || candidate.name,
            language: artist?.language || candidate.language || '',
            image: artist?.image || null,
            thumbnail: artist?.image || null,
            role: artist?.role || 'Artist',
            trendingScore: candidate.score,
          };
        } catch {
          return {
            id: `trending-${index}-${candidate.key.replace(/\s+/g, '-')}`,
            name: candidate.name,
            language: candidate.language || '',
            image: null,
            thumbnail: null,
            role: 'Artist',
            trendingScore: candidate.score,
          };
        }
      })
    );

    const payload = {
      success: true,
      source: 'aggregated',
      total: hydratedData.length,
      data: hydratedData,
    };

    // Cache for 1 hour
    await cacheService.set(cacheKey, payload, 3600);
    return res.json(payload);
  } catch (error) {
    console.error('Error in getTrendingArtists:', error);
    return res.status(500).json({ error: 'Failed to fetch trending artists' });
  }
};

// ... Liked Songs methods ...
exports.likeSong = async (req, res) => {
  try {
    const { songId, title, artist, album, thumbnail, duration, source } = req.body;
    const normalizedSongId = String(songId || '').trim();
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

// Liked Albums methods
exports.likeAlbum = async (req, res) => {
  try {
    const { albumId, name, artist, cover, year, type } = req.body;
    const normalizedAlbumId = String(albumId || '').trim();
    const userId = req.userId;

    if (!normalizedAlbumId) return res.status(400).json({ error: 'Album ID is required' });
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const connection = await pool.getConnection();
    try {
      const [existing] = await connection.execute('SELECT id FROM liked_albums WHERE user_id = ? AND album_id = ?', [userId, normalizedAlbumId]);
      if (existing.length > 0) return res.status(400).json({ error: 'Album already liked' });

      await connection.execute(
        `INSERT INTO liked_albums (user_id, album_id, name, artist, cover, year, type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, normalizedAlbumId, name || 'Untitled Album', artist || 'Unknown Artist', cover || null, year || '', type || 'Album']
      );
      return res.json({ success: true, message: 'Album liked successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in likeAlbum:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.unlikeAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const userId = req.userId;

    if (!albumId) return res.status(400).json({ error: 'Album ID is required' });
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute('DELETE FROM liked_albums WHERE user_id = ? AND album_id = ?', [userId, albumId]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Album like not found' });
      return res.json({ success: true, message: 'Album unliked successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in unlikeAlbum:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getLikedAlbums = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(`SELECT album_id, name, artist, cover, year, type, liked_at FROM liked_albums WHERE user_id = ? ORDER BY liked_at DESC`, [userId]);

      const mappedAlbums = rows.map(r => ({
        id: r.album_id,
        album_id: r.album_id,
        name: r.name,
        artist: r.artist,
        cover: r.cover,
        year: r.year,
        type: r.type,
        liked_at: r.liked_at
      }));

      return res.json({ success: true, data: mappedAlbums, total: mappedAlbums.length });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in getLikedAlbums:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getArtistImage = async (req, res) => {
  const artistName = String(req.query.name || '').trim();
  if (!artistName) return res.status(400).json({ error: 'Artist name is required' });

  const cacheKey = `artist_img::${artistName.toLowerCase()}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ url: cached });
    }

    const artist = await jioSaavnService.searchArtist(artistName);
    if (artist && artist.image) {
      await cacheService.set(cacheKey, artist.image, 86400); // 24 hours
      return res.json({ url: artist.image });
    }
    return res.json({ url: '' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch artist image' });
  }
};

exports.playSong = async (req, res) => {
  const { trackId } = req.params;
  const userId = req.userId;

  if (!trackId) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  try {
    const songDetails = await jioSaavnService.getSongDetails(trackId);
    if (songDetails) {
      // Auto-track play event if user is authenticated
      if (userId) {
        try {
          const popularSongService = require('../services/popularSongService');
          const db = require('../config/database');

          // Track in popularity table
          await popularSongService.trackSongPlay(trackId);

          // Track in user history table
          await db.query(
            `INSERT INTO user_play_history (user_id, song_id, event_type, occurred_at)
             VALUES (?, ?, 'play', CURRENT_TIMESTAMP)`,
            [userId, trackId]
          );
        } catch (trackError) {
          console.error('Error auto-tracking play:', trackError);
          // Don't fail the request if tracking fails
        }
      }

      return res.json({
        success: true,
        file_url: songDetails.file_url,
        song: songDetails
      });
    }

    return res.status(404).json({ error: 'Playable audio not found' });
  } catch (error) {
    console.error('Error in playSong:', error);
    return res.status(500).json({ error: 'Failed to retrieve playback track' });
  }
};
exports.streamSong = async (req, res) => {
  const { trackId } = req.params;
  const userId = req.userId; // May be undefined if not authenticated

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

    // Auto-track play event if user is authenticated
    if (userId) {
      try {
        const popularSongService = require('../services/popularSongService');
        const db = require('../config/database');

        // Track in popularity table
        await popularSongService.trackSongPlay(trackId);

        // Track in user history table
        await db.query(
          `INSERT INTO user_play_history (user_id, song_id, event_type, occurred_at)
           VALUES (?, ?, 'play', CURRENT_TIMESTAMP)`,
          [userId, trackId]
        );
      } catch (trackError) {
        console.error('Error auto-tracking play:', trackError);
        // Don't fail the request if tracking fails
      }
    }
  } catch (error) {
    console.error('Error in streamSong:', error.message || error);
    // Don't try to send response if headers already sent
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to stream audio' });
    }
  }
};

exports.getAlbumDetails = async (req, res) => {
  const albumId = String(req.params.albumId || '').trim();

  if (!albumId) {
    return res.status(400).json({ error: 'album id is required' });
  }

  try {
    const album = await jioSaavnService.getAlbumDetails(albumId);
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    return res.json({ success: true, source: 'jiosaavn', data: album });
  } catch (error) {
    console.error('Error in getAlbumDetails:', error);
    return res.status(500).json({ error: 'Failed to fetch album details' });
  }
};
exports.getArtistAlbums = async (req, res) => {
  const artistName = String(req.query.artist || req.query.name || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 24));

  if (!artistName) {
    return res.status(400).json({ error: 'artist name is required' });
  }

  const cacheKey = `albums:${artistName.toLowerCase()}:p${page}:l${limit}`;

  try {
    // 1. Check cache
    const cached = await cacheService.get(cacheKey);
    if (cached && req.query.nocache !== 'true') {
      const cachedData = Array.isArray(cached) ? cached : (cached.data || []);
      const cachedTotal = cached.total || cachedData.length;
      const cachedHasMore = cached.hasMore !== undefined ? cached.hasMore : true;
      return res.json({ success: true, source: 'cache', page, limit, total: cachedTotal, hasMore: cachedHasMore, data: cachedData });
    }

    let albums = [];
    let total = 0;

    if (page === 1) {
      // Page 1: Fetch artist details + JioSaavn album search category page 1
      const artist = await jioSaavnService.searchArtist(artistName);
      if (artist && artist.id) {
        const artistDetails = await jioSaavnService.getArtistDetails(artist.id);
        albums = artistDetails?.albums || [];
      }

      const catRes = await jioSaavnService.searchAlbumsCategory(artistName, 1, limit);
      const catResults = catRes?.results || [];
      total = catRes?.total || (albums.length + catResults.length);

      const seenIds = new Set((albums || []).map(a => a.id));
      for (const sa of catResults) {
        if (sa.id && !seenIds.has(sa.id)) {
          seenIds.add(sa.id);
          albums.push({
            id: sa.id,
            name: sa.name,
            cover: sa.cover || sa.image,
            year: sa.year || '',
            type: sa.type || 'Album',
            artist: sa.artist || artistName,
          });
        }
      }
    } else {
      // Page > 1: Query JioSaavn search.getAlbumResults for next page
      const catRes = await jioSaavnService.searchAlbumsCategory(artistName, page, limit);
      const catResults = catRes?.results || [];
      total = catRes?.total || 0;

      albums = catResults.map(sa => ({
        id: sa.id,
        name: sa.name,
        cover: sa.cover || sa.image,
        year: sa.year || '',
        type: sa.type || 'Album',
        artist: sa.artist || artistName,
      }));
    }

    const hasMore = albums.length > 0;
    const payload = { success: true, source: 'jiosaavn', page, limit, total, hasMore, data: albums };

    // Cache for 24 hours
    await cacheService.set(cacheKey, payload, 86400);

    return res.json(payload);
  } catch (error) {
    console.error('Error in getArtistAlbums:', error);
    return res.status(500).json({ error: 'Failed to fetch albums' });
  }
};

// Recommendation System Endpoints
exports.getPopularSongs = async (req, res) => {
  const popularSongService = require('../services/popularSongService');
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const songs = await popularSongService.getTopSongs(limit);
    res.json({ success: true, data: songs });
  } catch (err) {
    console.error('Popular songs error:', err);
    res.status(500).json({ error: 'Failed to fetch popular songs' });
  }
};

exports.trackSongPlay = async (req, res) => {
  const { songId } = req.body;
  const userId = req.userId;

  if (!songId) {
    return res.status(400).json({ error: 'Song ID is required' });
  }

  try {
    const popularSongService = require('../services/popularSongService');

    // Track in popularity table
    await popularSongService.trackSongPlay(songId);

    // Track in user history table
    const db = require('../config/database');
    await db.query(
      `INSERT INTO user_play_history (user_id, song_id, event_type, occurred_at)
       VALUES (?, ?, 'play', CURRENT_TIMESTAMP)`,
      [userId, songId]
    );

    res.json({ success: true, message: 'Play tracked' });
  } catch (error) {
    console.error('Error tracking song play:', error);
    res.status(500).json({ error: 'Failed to track play' });
  }
};

exports.trackUserEvent = async (req, res) => {
  const { songId, eventType } = req.body;
  const userId = req.userId;

  if (!songId) {
    return res.status(400).json({ error: 'Song ID is required' });
  }
  if (!eventType) {
    return res.status(400).json({ error: 'Event type is required' });
  }

  try {
    const db = require('../config/database');

    // Track in user history
    await db.query(
      `INSERT INTO user_play_history (user_id, song_id, event_type, occurred_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, songId, eventType]
    );

    // Track popularity for play and like events
    if (eventType === 'play' || eventType === 'like') {
      const popularSongService = require('../services/popularSongService');
      await popularSongService.trackSongPlay(songId, userId);
    }

    res.json({ success: true, message: 'Event tracked' });
  } catch (error) {
    console.error('Error tracking user event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
};

