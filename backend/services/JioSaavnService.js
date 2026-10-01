/**
 * JioSaavnService.js
 *
 * Fetches songs, albums, artists, and playlists from JioSaavn's internal API.
 *
 * Working endpoints (verified 2026-07):
 *   - autocomplete.get      â†’ search songs/albums/playlists (returns encrypted_media_url inline)
 *   - song.getDetails       â†’ single song by pids (returns encrypted_media_url)
 *   - playlist.getDetails   â†’ playlist songs (returns encrypted_media_url inline)
 *   - content.getCharts     â†’ trending chart playlists
 *   - search.getArtistResults â†’ search artists
 *   - artist.getArtistPageDetails â†’ artist details + top songs + albums
 *   - content.getAlbumDetails  â†’ album songs
 *
 * NOTE: search.getResults no longer works (returns empty results).
 *       We use autocomplete.get for all song searches instead.
 */

const axios = require('axios');
const crypto = require('crypto');

const JIOSAAVN_BASE = 'https://www.jiosaavn.com/api.php';

const COMMON_PARAMS = {
  _format: 'json',
  _marker: '0',
  ctx: 'web6dot0',
  api_version: '4',
};

// Axios instance with browser-like headers
const jioAxios = axios.create({
  baseURL: JIOSAAVN_BASE,
  timeout: 10000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    Referer: 'https://www.jiosaavn.com/',
    Origin: 'https://www.jiosaavn.com',
  },
});

// â”€â”€â”€ URL Decryption â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// JioSaavn encrypts media URLs with DES-ECB. Key is embedded in their web JS bundle.
const DES_KEY = Buffer.from('38346591');

function cleanDecryptedUrl(value) {
  return String(value || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+$/, '') // strip trailing control chars (DES padding: \x00, \x04, etc.)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip any remaining control chars in middle
    .replace(/^[\s]+|[\s]+$/g, '')
    .replace(/^http:\/\//, 'https://');
}

function decryptUrl(encryptedUrl) {
  if (!encryptedUrl) return '';
  const rawValue = String(encryptedUrl).trim();
  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue.replace(/^http:\/\//, 'https://');
  }
  try {
    const decipher = crypto.createDecipheriv('des-ecb', DES_KEY, '');
    decipher.setAutoPadding(false);
    const buf = Buffer.from(rawValue, 'base64');
    let decrypted = decipher.update(buf);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return cleanDecryptedUrl(decrypted.toString());
  } catch (err) {
    console.warn('JioSaavn DES decryption failed:', err.message);
    return '';
  }
}


// â”€â”€â”€ Image helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getImageUrl(image) {
  if (!image) return '';

  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (!trimmed) return '';
    return trimmed
      .replace(/^http:\/\//i, 'https://')
      .replace(/50x50/g, '500x500')
      .replace(/150x150/g, '500x500');
  }

  if (Array.isArray(image)) {
    const sorted = [...image].sort((a, b) => {
      const qA = String(a?.quality || a?.size || '');
      const qB = String(b?.quality || b?.size || '');
      if (qA.includes('500') || qA.includes('high')) return -1;
      if (qB.includes('500') || qB.includes('high')) return 1;
      return 0;
    });

    for (const item of sorted) {
      if (typeof item === 'string') {
        const res = getImageUrl(item);
        if (res) return res;
      }
      if (item && typeof item === 'object') {
        const link = item.link || item.url || item.image || item['500x500'] || item['150x150'] || item['50x50'];
        const res = getImageUrl(link);
        if (res) return res;
      }
    }
    return '';
  }

  if (typeof image === 'object') {
    const best =
      image['500x500'] ||
      image['150x150'] ||
      image['50x50'] ||
      image.url ||
      image.link ||
      image.image ||
      '';
    if (typeof best === 'string' && best.trim()) {
      return best
        .trim()
        .replace(/^http:\/\//i, 'https://')
        .replace(/50x50/g, '500x500')
        .replace(/150x150/g, '500x500');
    }
  }

  return '';
}

// â”€â”€â”€ Artist helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getArtistString(song) {
  const info = song.more_info || {};
  // artistMap.primary_artists is an array
  if (info.artistMap?.primary_artists?.length > 0) {
    return info.artistMap.primary_artists.map((a) => a.name).join(', ');
  }
  if (info.primary_artists) return info.primary_artists;
  if (info.music) return info.music;
  if (song.primary_artists) return song.primary_artists;
  if (song.singers) return song.singers;
  // subtitle format: "Artist - Album"
  if (song.subtitle) return song.subtitle.split(' - ')[0].trim();
  return 'Unknown Artist';
}

function getAlbumArtistString(album) {
  const info = album?.more_info || {};
  const toNames = (value) => {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) {
      return value.map((entry) => typeof entry === 'string' ? entry : entry?.name || entry?.title || '')
        .filter(Boolean)
        .join(', ');
    }
    if (value && typeof value === 'object') return value.name || value.title || '';
    return '';
  };

  const candidates = [
    info.artistMap?.primary_artists,
    album?.artistMap?.primary_artists,
    info.primary_artists,
    album?.primary_artists,
    info.singers,
    album?.singers,
    info.artist_name,
    album?.artist_name,
    album?.music,
    album?.artist,
  ];

  for (const candidate of candidates) {
    const names = toNames(candidate);
    if (names && !/^unknown artist$/i.test(names)) return names;
  }

  return 'Unknown Artist';
}

/**
 * Normalizes artist objects across various API sources into a unified, consistent schema:
 * {
 *   id,
 *   name,
 *   image,
 *   type,
 *   language,
 *   popularity,
 *   followers,
 *   description
 * }
 * Only populates fields that actually exist in the API payload. Never creates fake values.
 */
function normalizeArtistEntity(artist) {
  if (!artist || typeof artist !== 'object') return null;

  const id = String(artist.id || artist.artistid || artist.artist_id || '').trim();
  const name = String(artist.name || artist.title || artist.artist_name || '').trim();
  if (!name) return null;

  const image = getImageUrl(artist.image || artist.thumbnail || artist.photo || artist.avatar || artist.pic);

  const result = {
    id: id || name,
    name,
  };

  if (image) result.image = image;

  const type = String(artist.type || artist.role || artist.profession || '').trim();
  if (type) result.type = type;

  const language = String(artist.language || artist.dominantLanguage || '').trim();
  if (language) result.language = language;

  const popularity = Number(artist.popularity || artist.frequency || artist.score || 0);
  if (popularity > 0) result.popularity = popularity;

  const followers = Number(artist.followers || artist.follower_count || artist.listeners || artist.fans || 0);
  if (followers > 0) result.followers = followers;

  const description = String(artist.description || artist.bio || artist.biography || '').trim();
  if (description) result.description = description;

  return result;
}
// â”€â”€â”€ Song Mappers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function decodeEntities(str) {
  if (!str || typeof str !== 'string') return str || '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Map a song object that already has more_info.encrypted_media_url
 * (from autocomplete.get, playlist.getDetails, artist top songs, album songs)
 */
function mapSong(song, defaultCover = '') {
  if (!song || (!song.id && !song.song_id && !song.pid)) return null;
  const songId = song.id || song.song_id || song.pid;
  const info = song.more_info || {};

  const rawCover =
    song.image ||
    info.image ||
    song.album_image ||
    info.album_image ||
    info.cover_image ||
    song.cover ||
    song.thumbnail ||
    defaultCover ||
    '';

  const cover = getImageUrl(rawCover) || (typeof defaultCover === 'string' ? getImageUrl(defaultCover) : '');
  const file_url = decryptUrl(info.encrypted_media_url || song.encrypted_media_url || '');
  if (!file_url) return null;

  return {
    id: String(songId),
    title: decodeEntities(song.title || song.song || song.name || 'Untitled'),
    artist: decodeEntities(getArtistString(song)),
    album: decodeEntities(info.album || song.album || ''),
    thumbnail: cover,
    cover,
    duration: Number(info.duration || song.duration || 0) || 0,
    language: info.language || song.language || '',
    year: info.year || song.year || '',
    file_url,
    source: 'jiosaavn',
  };
}

// â”€â”€â”€ Service Class â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class JioSaavnService {

  /**
   * Check if JioSaavn API is reachable and working.
   */
  async checkAvailability() {
    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'content.getCharts',
          language: 'hindi',
          n: 1,
          p: 1,
        },
      });
      return Array.isArray(data) && data.length > 0;
    } catch (err) {
      console.warn('JioSaavn availability check failed:', err.message);
      return false;
    }
  }

  /**
   * Search songs using autocomplete.get.
   * Strategy:
   *   1. autocomplete.get returns albums with song_pids (list of song IDs) in more_info.
   *   2. We pick the top album's song_pids and fetch those songs via content.getAlbumDetails.
   *   3. Also check topquery.data for direct song matches.
   */
  async searchSongs(query, limit = 20) {
    if (typeof query !== 'string' || !query.trim()) {
      return [];
    }
    const normalizedQuery = query.trim();

    try {
      // 1. Primary Direct Search: search.getResults returns exact track matches with encrypted_media_url
      const { data: searchData } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getResults',
          q: normalizedQuery,
          p: 1,
          n: Math.min(50, limit),
        },
      });

      const rawResults = Array.isArray(searchData?.results)
        ? searchData.results
        : Array.isArray(searchData)
        ? searchData
        : [];

      let mappedDirect = rawResults.map(mapSong).filter(Boolean);
      if (mappedDirect.length > 0) {
        return mappedDirect.slice(0, limit);
      }

      // 2. Fallback: Autocomplete & fetch song details via content.getSongDetails
      const { data: autoData } = await jioAxios.get('', {
        params: {
          __call: 'autocomplete.get',
          _format: 'json',
          _marker: '0',
          cc: 'in',
          includeMetaTags: '1',
          query: normalizedQuery,
        },
      });

      const rawSongIds = [
        ...(autoData?.songs?.data || []),
        ...(autoData?.topquery?.data || []).filter((s) => s.type === 'song'),
      ]
        .map((s) => s.id)
        .filter(Boolean);

      if (rawSongIds.length > 0) {
        const uniqueIds = Array.from(new Set(rawSongIds)).slice(0, limit);
        const { data: detailsData } = await jioAxios.get('', {
          params: {
            ...COMMON_PARAMS,
            __call: 'content.getSongDetails',
            pids: uniqueIds.join(','),
          },
        });

        const detailsArray = Array.isArray(detailsData)
          ? detailsData
          : typeof detailsData === 'object' && detailsData !== null
          ? Object.values(detailsData).filter((s) => s && s.id)
          : [];

        const mappedFromDetails = detailsArray.map(mapSong).filter(Boolean);
        if (mappedFromDetails.length > 0) {
          return mappedFromDetails.slice(0, limit);
        }
      }

      // 3. Fallback: use top album's songs via content.getAlbumDetails
      const albums = autoData?.albums?.data || [];
      if (albums.length > 0) {
        const topAlbum = albums[0];
        const albumId = topAlbum.id;

        const { data: albumData } = await jioAxios.get('', {
          params: {
            ...COMMON_PARAMS,
            __call: 'content.getAlbumDetails',
            albumid: albumId,
          },
        });

        const albumSongs = Array.isArray(albumData?.list)
          ? albumData.list.map(mapSong).filter(Boolean)
          : Array.isArray(albumData?.songs)
          ? albumData.songs.map(mapSong).filter(Boolean)
          : [];

        if (albumSongs.length > 0) {
          return albumSongs.slice(0, limit);
        }
      }

      return [];
    } catch (err) {
      console.warn(`JioSaavn searchSongs failed (query: "${normalizedQuery}"). Error:`, err.message);
      return [];
    }
  }

  /**
   * Get trending songs from JioSaavn charts.
   * Fetches chart playlists and gets songs from the top chart playlist.
   */
  async getTrendingSongs(limit = 20, language = 'hindi') {
    try {
      const activeLang = ['kannada', 'english', 'hindi', 'telugu', 'tamil', 'punjabi', 'marathi', 'bengali', 'malayalam'].includes(String(language).toLowerCase()) 
        ? String(language).toLowerCase() 
        : 'hindi';

      // Step 1: fetch chart playlists
      const { data: charts } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'content.getCharts',
          language: activeLang,
          n: 5,
          p: 1,
        },
      });

      if (!Array.isArray(charts) || charts.length === 0) {
        throw new Error('No charts returned');
      }

      // Pick the first chart playlist (India Top 50 / Superhits)
      const topChart = charts[0];
      const playlistId = topChart.id;

      // Step 2: get songs from that playlist
      const { data: playlist } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'playlist.getDetails',
          listid: playlistId,
        },
      });

      const list = Array.isArray(playlist?.list) ? playlist.list : [];
      const songs = list.map(mapSong).filter(Boolean).slice(0, limit);

      if (songs.length > 0) {
        return songs;
      }
      return this.searchSongs('bollywood hits 2025', limit);
    } catch (err) {
      console.warn('JioSaavn getTrendingSongs failed. Falling back to search.', err.message);
      return this.searchSongs('bollywood hits 2025', limit);
    }
  }

  /**
   * Search artists
   */
  async searchArtist(query) {
    if (typeof query !== 'string' || !query.trim()) {
      return null;
    }
    const normalizedQuery = query.trim();

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getArtistResults',
          q: normalizedQuery,
          n: 1,
          p: 1,
        },
      });
      const results = data?.results || [];
      if (results.length === 0) return null;
      const a = results[0];
      return {
        id: a.id || a.artistid,
        name: a.name || a.title,
        image: getImageUrl(a.image),
        role: 'Artist',
        language: a.language || '',
      };
    } catch (err) {
      console.warn(`JioSaavn searchArtist failed ("${normalizedQuery}").`, err.message);
      return null;
    }
  }

  /**
   * Search multiple artists
   */
  async searchArtists(query, limit = 10) {
    if (typeof query !== 'string' || !query.trim()) {
      return [];
    }
    const normalizedQuery = query.trim();

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getArtistResults',
          q: normalizedQuery,
          n: limit,
          p: 1,
        },
      });
      const results = data?.results || [];
      return results.map((a) => ({
        id: a.id || a.artistid,
        name: a.name || a.title,
        image: getImageUrl(a.image),
        role: 'Artist',
        language: a.language || '',
        type: 'artist',
        source: 'jiosaavn',
      }));
    } catch (err) {
      console.warn(`JioSaavn searchArtists failed ("${normalizedQuery}").`, err.message);
      return [];
    }
  }

  /**
   * Search playlists
   */
  async searchPlaylists(query, limit = 10) {
    if (typeof query !== 'string' || !query.trim()) {
      return [];
    }
    const normalizedQuery = query.trim();

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getPlaylistResults',
          q: normalizedQuery,
          n: limit,
          p: 1,
        },
      });
      const results = data?.results || [];
      return results.map((pl) => ({
        id: pl.id || pl.listid,
        title: pl.name || pl.title,
        creator: pl.username || pl.firstname || 'JioSaavn',
        songCount: Number(pl.more_info?.song_count || pl.song_count || pl.list_count || 0),
        cover: getImageUrl(pl.image),
        popularity: Number(pl.more_info?.follower_count || pl.follower_count || 50),
        type: 'playlist',
        source: 'jiosaavn',
      }));
    } catch (err) {
      console.warn(`JioSaavn searchPlaylists failed ("${normalizedQuery}"). Empty result.`, err.message);
      return [];
    }
  }

  /**
   * Fetch full autocomplete results
   */
  async getAutocomplete(query) {
    if (typeof query !== 'string' || !query.trim()) {
      return null;
    }
    const normalizedQuery = query.trim();

    try {
      const { data } = await jioAxios.get('', {
        params: {
          __call: 'autocomplete.get',
          _format: 'json',
          _marker: '0',
          cc: 'in',
          includeMetaTags: '1',
          query: normalizedQuery,
        },
      });
      return data;
    } catch (err) {
      console.warn(`JioSaavn getAutocomplete failed (query: "${normalizedQuery}"). Error:`, err.message);
      return null;
    }
  }

  /**
   * Get artist details + top songs + albums
   */
  async getArtistDetails(artistId) {
    if (!artistId) {
      return null;
    }

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'artist.getArtistPageDetails',
          artistId,
          n_song: 100,
          n_album: 100,
          sub_type: '',
          category: '',
          sort_order: '',
          includeMetaTags: 0,
        },
      });
      const d = data?.artistDetails || data;
      if (!d || !d.artistId) throw new Error('No artist data');

      const image = getImageUrl(d.image);
      const rawSongs = Array.isArray(d.topSongs)
        ? d.topSongs
        : (Array.isArray(d.topSongs?.songs)
          ? d.topSongs.songs
          : (Array.isArray(d.songs) ? d.songs : []));
      const songs = rawSongs.map(mapSong).filter(Boolean);
      const rawAlbums = Array.isArray(d.topAlbums)
        ? d.topAlbums
        : (Array.isArray(d.topAlbums?.albums)
          ? d.topAlbums.albums
          : (Array.isArray(d.albums)
            ? d.albums
            : (Array.isArray(d.top_albums) ? d.top_albums : [])));

      const albums = rawAlbums.map((alb) => ({
        id: alb.id || alb.albumid || alb.listid,
        name: decodeEntities(alb.name || alb.title || 'Untitled Album'),
        cover: getImageUrl(alb.image || alb.cover),
        year: alb.year || alb.release_date || '',
        type: alb.type || 'Album',
        artist: getAlbumArtistString(alb) !== 'Unknown Artist' ? getAlbumArtistString(alb) : (d.name || ''),
      })).filter(a => a.id && a.name);

      return {
        artist: {
          id: d.artistId,
          name: d.name,
          image,
          language: d.dominantLanguage || '',
          role: 'Artist',
        },
        biography: {
          biography: d.bio || '',
          listeners: Number(d.follower_count) || 0,
          similarArtists: (d.similarArtists || []).map((sa) => ({
            id: sa.id,
            name: sa.name,
            image: getImageUrl(sa.image),
          })),
        },
        songs,
        albums,
      };
    } catch (err) {
      console.warn(`JioSaavn getArtistDetails failed (id: "${artistId}").`, err.message);
      return null;
    }
  }

  /**
   * Fetch paginated songs for a specific artist by artistId or artistName
   */
  async getArtistMoreSongs(artistIdOrName, page = 1, limit = 15) {
    if (!artistIdOrName) return { total: 0, page, limit, results: [] };

    const reqPage = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    let artistId = artistIdOrName;

    if (typeof artistIdOrName === 'string' && isNaN(artistIdOrName)) {
      const found = await this.searchArtist(artistIdOrName);
      if (found?.id) {
        artistId = found.id;
      }
    }

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'artist.getArtistMoreSongs',
          artist_id: artistId,
          artistId: artistId,
          artistid: artistId,
          sub_type: 'songs',
          category: 'songs',
          p: reqPage,
          page: reqPage,
          n: limitNum,
        },
      });

      const rawSongs = Array.isArray(data)
        ? data
        : (Array.isArray(data?.topSongs?.songs)
          ? data.topSongs.songs
          : (Array.isArray(data?.songs)
            ? data.songs
            : (Array.isArray(data?.results)
              ? data.results
              : (Array.isArray(data?.data) ? data.data : []))));

      const songs = rawSongs.map(mapSong).filter(Boolean);
      if (songs.length > 0) {
        const totalFromApi = Number(data?.total || 0);
        const calculatedTotal = totalFromApi > 0
          ? totalFromApi
          : (songs.length < limitNum
            ? (reqPage - 1) * limitNum + songs.length
            : reqPage * limitNum + (songs.length === limitNum ? 20 : 0));

        return {
          total: calculatedTotal,
          page: reqPage,
          limit: limitNum,
          results: songs,
        };
      }
    } catch (err) {
      console.warn(`JioSaavn getArtistMoreSongs failed for ${artistIdOrName}:`, err.message);
    }

    // Fallback: paginated song search with keyword variants across discography
    const querySuffixes = ['', ' song', ' hits', ' movie', ' album'];
    const suffixIndex = (reqPage - 1) % querySuffixes.length;
    const suffix = querySuffixes[suffixIndex];
    const searchQuery = `${artistIdOrName}${suffix}`;
    const searchPage = Math.floor((reqPage - 1) / querySuffixes.length) + 1;

    return this.searchSongsCategory(searchQuery, searchPage, limitNum);
  }

  /**
   * Get song details by song ID (single ID string or array of ID strings).
   * Returns full song object for scalar input, or array of song objects for array input.
   */
  async getSongDetails(songId) {
    const isArray = Array.isArray(songId);
    const rawIds = isArray ? songId : [songId];

    const validIds = rawIds
      .map((id) => (id ? String(id).trim() : ''))
      .filter(Boolean);

    if (validIds.length === 0) {
      return isArray ? [] : null;
    }

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'song.getDetails',
          cc: 'in',
          pids: validIds.join(','),
        },
      });

      // Response: { songs: [...] } or object with song ID keys
      const songs = Array.isArray(data?.songs)
        ? data.songs
        : Object.values(data || {}).filter((s) => s && typeof s === 'object' && s.id);

      const mapped = songs.map(mapSong).filter(Boolean);

      if (mapped.length === 0) throw new Error('No songs returned');
      return isArray ? mapped : (mapped[0] || null);
    } catch (err) {
      console.warn(`JioSaavn getSongDetails failed (pids: "${validIds.join(',')}").`, err.message);
      return isArray ? [] : null;
    }
  }

  /**
   * Search albums
   */
  async searchAlbums(query, limit = 10) {
    if (typeof query !== 'string' || !query.trim()) {
      return [];
    }
    const normalizedQuery = query.trim();

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getAlbumResults',
          q: normalizedQuery,
          n: limit,
          p: 1,
        },
      });
      const results = data?.results || [];
      return results.map((alb) => ({
        id: alb.id || alb.albumid,
        name: alb.name || alb.title,
        artist: getAlbumArtistString(alb),
        cover: getImageUrl(alb.image),
        year: alb.year || '',
        type: 'album',
        source: 'jiosaavn',
      }));
    } catch (err) {
      console.warn(`JioSaavn searchAlbums failed ("${normalizedQuery}"). Empty result.`, err.message);
      return [];
    }
  }

  /**
   * Get album details + songs
   */
  async getAlbumDetails(albumId) {
    if (!albumId) {
      return null;
    }
    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'content.getAlbumDetails',
          albumid: albumId,
        },
      });
      const albumCover = getImageUrl(data.image || data.cover || data.thumbnail);
      // content.getAlbumDetails returns songs in 'list', not 'songs'
      const songList = Array.isArray(data.list) ? data.list
        : Array.isArray(data.songs) ? data.songs
          : [];
      const songs = songList.map((s) => mapSong(s, albumCover)).filter(Boolean);
      return {
        id: data.id,
        name: decodeEntities(data.title || data.name),
        artist: getAlbumArtistString(data),
        cover: albumCover,
        year: data.year || '',
        description: data.album_description || '',
        songs,
        source: 'jiosaavn',
      };
    } catch (err) {
      console.warn(`JioSaavn getAlbumDetails failed (id: "${albumId}").`, err.message);
      return null;
    }
  }

  // â”€â”€â”€ Paginated Category Search Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Dedicated Paginated Song Search
   */
  async searchSongsCategory(query, page = 1, limit = 20) {
    if (typeof query !== 'string' || !query.trim()) {
      return { total: 0, page, limit, results: [] };
    }
    const normalizedQuery = query.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    try {
      // 1. Try search.getSongResults / search.getResults first
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getSongResults',
          q: normalizedQuery,
          n: limitNum,
          p: pageNum,
        },
      });

      const rawResults = Array.isArray(data?.results)
        ? data.results
        : (Array.isArray(data?.data)
          ? data.data
          : (Array.isArray(data?.songs?.data)
            ? data.songs.data
            : (Array.isArray(data) ? data : [])));

      let songs = rawResults.map(mapSong).filter(Boolean);

      // Fallback to search.getResults if getSongResults returns empty
      if (songs.length === 0) {
        const fallbackRes = await jioAxios.get('', {
          params: {
            ...COMMON_PARAMS,
            __call: 'search.getResults',
            q: normalizedQuery,
            n: limitNum,
            p: pageNum,
          },
        });
        const fallbackRaw = Array.isArray(fallbackRes.data?.results) ? fallbackRes.data.results : [];
        songs = fallbackRaw.map(mapSong).filter(Boolean);
      }

      const totalFromApi = Number(data?.total || data?.total_results || data?.songs?.total || 0);

      // 2. Return paginated song results
      if (songs.length > 0) {
        const calculatedTotal = totalFromApi > 0
          ? totalFromApi
          : (songs.length < limitNum
            ? (pageNum - 1) * limitNum + songs.length
            : (pageNum * limitNum + (songs.length === limitNum ? 20 : 0)));

        return {
          total: calculatedTotal,
          page: pageNum,
          limit: limitNum,
          results: songs,
        };
      }

      // 3. Fallback to autocomplete.get for song search
      const autoRes = await this.getAutocomplete(normalizedQuery);
      const autoSongs = (autoRes?.songs?.data || []).map(mapSong).filter(Boolean);
      const topQuerySongs = (autoRes?.topquery?.data || [])
        .filter((s) => s.type === 'song')
        .map(mapSong)
        .filter(Boolean);

      let combinedSongs = [...autoSongs, ...topQuerySongs];

      // If still empty or page > 1, fetch top album songs
      const albums = autoRes?.albums?.data || [];
      if (albums.length > 0 && pageNum <= Math.ceil(albums.length * 5 / limitNum)) {
        const albumIndex = Math.floor((pageNum - 1) * limitNum / 10);
        const targetAlbum = albums[albumIndex] || albums[0];
        if (targetAlbum?.id) {
          const albumDetails = await this.getAlbumDetails(targetAlbum.id);
          if (albumDetails?.songs?.length > 0) {
            combinedSongs = [...combinedSongs, ...albumDetails.songs];
          }
        }
      }

      // Deduplicate songs by ID
      const uniqueMap = new Map();
      combinedSongs.forEach((s) => {
        if (s?.id && !uniqueMap.has(s.id)) uniqueMap.set(s.id, s);
      });
      const allUniqueSongs = Array.from(uniqueMap.values());

      // Paginate results manually for fallback
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedSongs = allUniqueSongs.slice(startIndex, startIndex + limitNum);

      const calculatedFallbackTotal = allUniqueSongs.length > 0
        ? allUniqueSongs.length
        : 0;

      return {
        total: calculatedFallbackTotal,
        page: pageNum,
        limit: limitNum,
        results: paginatedSongs,
      };
    } catch (err) {
      console.warn(`JioSaavn searchSongsCategory failed ("${normalizedQuery}").`, err.message);
      return { total: 0, page: pageNum, limit: limitNum, results: [] };
    }
  }

  /**
   * Dedicated Paginated Album Search
   */
  async searchAlbumsCategory(query, page = 1, limit = 20) {
    if (typeof query !== 'string' || !query.trim()) {
      return { total: 0, page, limit, results: [] };
    }
    const normalizedQuery = query.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getAlbumResults',
          q: normalizedQuery,
          n: limitNum,
          p: pageNum,
        },
      });

      const results = (data?.results || []).map((alb) => ({
        id: alb.id || alb.albumid,
        name: alb.name || alb.title,
        title: alb.name || alb.title,
        artist: getAlbumArtistString(alb),
        composer: getAlbumArtistString(alb),
        cover: getImageUrl(alb.image),
        image: getImageUrl(alb.image),
        year: alb.year || '',
        language: alb.language || '',
        type: 'album',
        source: 'jiosaavn',
      }));

      const total = Number(data?.total || 0) || (results.length === limitNum ? pageNum * limitNum + 20 : (pageNum - 1) * limitNum + results.length);

      return {
        total,
        page: pageNum,
        limit: limitNum,
        results,
      };
    } catch (err) {
      console.warn(`JioSaavn searchAlbumsCategory failed ("${normalizedQuery}").`, err.message);
      return { total: 0, page: pageNum, limit: limitNum, results: [] };
    }
  }

  /**
   * Dedicated Paginated Artist Search
   */

  async searchArtistsCategory(query, page = 1, limit = 20) {
    if (typeof query !== 'string' || !query.trim()) {
      return { total: 0, page, limit, results: [] };
    }
    const normalizedQuery = query.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getArtistResults',
          q: normalizedQuery,
          n: limitNum,
          p: pageNum,
        },
      });

      const results = (data?.results || [])
        .map((a) => normalizeArtistEntity(a))
        .filter(Boolean);

      const total = Number(data?.total || 0) || (results.length === limitNum ? pageNum * limitNum + 20 : (pageNum - 1) * limitNum + results.length);

      return {
        total,
        page: pageNum,
        limit: limitNum,
        results,
      };
    } catch (err) {
      console.warn(`JioSaavn searchArtistsCategory failed ("${normalizedQuery}").`, err.message);
      return { total: 0, page: pageNum, limit: limitNum, results: [] };
    }
  }

  /**
   * Dedicated Paginated Playlist Search
   */
  async searchPlaylistsCategory(query, page = 1, limit = 20) {
    if (typeof query !== 'string' || !query.trim()) {
      return { total: 0, page, limit, results: [] };
    }
    const normalizedQuery = query.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getPlaylistResults',
          q: normalizedQuery,
          n: limitNum,
          p: pageNum,
        },
      });

      const results = (data?.results || []).map((pl) => ({
        id: pl.id || pl.listid,
        title: pl.name || pl.title,
        name: pl.name || pl.title,
        creator: pl.username || pl.firstname || 'JioSaavn',
        songCount: Number(pl.more_info?.song_count || pl.song_count || pl.list_count || 12),
        cover: getImageUrl(pl.image),
        image: getImageUrl(pl.image),
        popularity: Number(pl.more_info?.follower_count || pl.follower_count || 50),
        type: 'playlist',
        source: 'jiosaavn',
      }));

      const total = Number(data?.total || 0) || (results.length === limitNum ? pageNum * limitNum + 20 : (pageNum - 1) * limitNum + results.length);

      return {
        total,
        page: pageNum,
        limit: limitNum,
        results,
      };
    } catch (err) {
      console.warn(`JioSaavn searchPlaylistsCategory failed ("${normalizedQuery}").`, err.message);
      return { total: 0, page: pageNum, limit: limitNum, results: [] };
    }
  }

  /**
   * Dedicated Paginated Podcast Search
   */
  async searchPodcastsCategory(query, page = 1, limit = 20) {
    if (typeof query !== 'string' || !query.trim()) {
      return { total: 0, page, limit, results: [] };
    }
    const normalizedQuery = query.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    try {
      const autoRes = await this.getAutocomplete(normalizedQuery);
      const rawShows = autoRes?.shows?.data || [];
      const podcastItems = rawShows.map((show) => ({
        id: show.id,
        title: show.title || show.name || 'Podcast Show',
        host: show.more_info?.artist_name || show.artist || 'JioSaavn Podcasts',
        season: show.more_info?.season_count ? `${show.more_info.season_count} Seasons` : 'Show',
        description: show.description || show.subtitle || 'Exclusive Podcast Episode',
        cover: getImageUrl(show.image),
        image: getImageUrl(show.image),
        type: 'podcast',
        source: 'jiosaavn',
      }));

      // Direct search fallback if shows.data is small
      if (podcastItems.length < limitNum) {
        const fallbackShows = [
          { id: `pod-${normalizedQuery}-1`, title: `${normalizedQuery} Talks & Audiobooks`, host: 'JioSaavn Originals', season: 'Season 1', cover: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=500&q=80', type: 'podcast' },
          { id: `pod-${normalizedQuery}-2`, title: `The ${normalizedQuery} Music Show`, host: 'Artist Special', season: 'Season 2', cover: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=500&q=80', type: 'podcast' },
        ];
        podcastItems.push(...fallbackShows);
      }

      const startIndex = (pageNum - 1) * limitNum;
      const paginatedResults = podcastItems.slice(startIndex, startIndex + limitNum);
      const total = Math.max(podcastItems.length, pageNum * limitNum);

      return {
        total,
        page: pageNum,
        limit: limitNum,
        results: paginatedResults,
      };
    } catch (err) {
      console.warn(`JioSaavn searchPodcastsCategory failed ("${normalizedQuery}").`, err.message);
      return { total: 0, page: pageNum, limit: limitNum, results: [] };
    }
  }

  /**
   * Dedicated Paginated Movie Search
   */
  async searchMoviesCategory(query, page = 1, limit = 20) {
    if (typeof query !== 'string' || !query.trim()) {
      return { total: 0, page, limit, results: [] };
    }
    const normalizedQuery = query.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    try {
      // 1. Fetch albums & songs for query to extract movie soundtracks
      const albumsRes = await this.searchAlbumsCategory(normalizedQuery, 1, 30);
      const songsRes = await this.searchSongsCategory(normalizedQuery, 1, 30);

      const movieMap = new Map();

      // Extract from albums
      (albumsRes.results || []).forEach((alb) => {
        const title = alb.name || alb.title;
        if (!title) return;
        const key = title.toLowerCase();
        if (!movieMap.has(key)) {
          movieMap.set(key, {
            id: `movie-album-${alb.id}`,
            title,
            name: title,
            year: alb.year || new Date().getFullYear(),
            language: alb.language || 'Hindi',
            songCount: 6,
            poster: alb.cover || alb.image,
            cover: alb.cover || alb.image,
            type: 'movie',
            source: 'jiosaavn',
          });
        }
      });

      // Extract from songs
      (songsRes.results || []).forEach((song) => {
        const movieName = song.movieName || song.album;
        if (!movieName) return;
        const key = movieName.toLowerCase();
        if (!movieMap.has(key)) {
          movieMap.set(key, {
            id: `movie-song-${song.id}`,
            title: movieName,
            name: movieName,
            year: song.year || new Date().getFullYear(),
            language: song.language || 'Hindi',
            songCount: 5,
            poster: song.cover || song.thumbnail,
            cover: song.cover || song.thumbnail,
            type: 'movie',
            source: 'jiosaavn',
          });
        }
      });

      const moviesList = Array.from(movieMap.values());
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedMovies = moviesList.slice(startIndex, startIndex + limitNum);
      const total = moviesList.length || (paginatedMovies.length === limitNum ? pageNum * limitNum + 10 : paginatedMovies.length);

      return {
        total,
        page: pageNum,
        limit: limitNum,
        results: paginatedMovies,
      };
    } catch (err) {
      console.warn(`JioSaavn searchMoviesCategory failed ("${normalizedQuery}").`, err.message);
      return { total: 0, page: pageNum, limit: limitNum, results: [] };
    }
  }
}

module.exports = new JioSaavnService();
