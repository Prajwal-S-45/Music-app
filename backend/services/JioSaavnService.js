/**
 * JioSaavnService.js
 *
 * Fetches songs, albums, artists, and playlists from JioSaavn's internal API.
 *
 * Working endpoints (verified 2026-07):
 *   - autocomplete.get      → search songs/albums/playlists (returns encrypted_media_url inline)
 *   - song.getDetails       → single song by pids (returns encrypted_media_url)
 *   - playlist.getDetails   → playlist songs (returns encrypted_media_url inline)
 *   - content.getCharts     → trending chart playlists
 *   - search.getArtistResults → search artists
 *   - artist.getArtistPageDetails → artist details + top songs + albums
 *   - content.getAlbumDetails  → album songs
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

// ─── URL Decryption ───────────────────────────────────────────────────────────
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


// ─── Image helpers ─────────────────────────────────────────────────────────
function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') {
    return image.replace('http://', 'https://').replace('50x50', '500x500').replace('150x150', '500x500');
  }
  // object with quality keys
  const best = image['500x500'] || image['150x150'] || image['50x50'] || '';
  return best.replace('http://', 'https://');
}

// ─── Artist helpers ────────────────────────────────────────────────────────
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

// ─── Song Mappers ──────────────────────────────────────────────────────────

/**
 * Map a song object that already has more_info.encrypted_media_url
 * (from autocomplete.get, playlist.getDetails, artist top songs, album songs)
 */
function mapSong(song) {
  if (!song || !song.id) return null;
  const info = song.more_info || {};
  const cover = getImageUrl(song.image);
  const file_url = decryptUrl(info.encrypted_media_url || '');

  return {
    id: song.id,
    videoId: null,
    title: song.title || song.song || 'Untitled',
    artist: getArtistString(song),
    album: info.album || song.album || '',
    thumbnail: cover,
    cover,
    duration: Number(info.duration) || 0,
    language: info.language || song.language || '',
    year: info.year || song.year || '',
    file_url,
    source: 'jiosaavn',
  };
}

// ─── Mock Fallback ────────────────────────────────────────────────────────────
const MOCK_FALLBACK_SONGS = [
  {
    id: 'mock-song-1', videoId: null,
    title: "Kesariya (From 'Brahmastra')", artist: 'Arijit Singh, Pritam', album: 'Brahmastra',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
    duration: 270, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', source: 'mock-fallback',
  },
  {
    id: 'mock-song-2', videoId: null,
    title: "Apna Bana Le (From 'Bhediya')", artist: 'Arijit Singh, Sachin-Jigar', album: 'Bhediya',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
    duration: 204, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', source: 'mock-fallback',
  },
  {
    id: 'mock-song-3', videoId: null,
    title: "Chaleya (From 'Jawan')", artist: 'Anirudh Ravichander, Arijit Singh', album: 'Jawan',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
    duration: 200, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', source: 'mock-fallback',
  },
  {
    id: 'mock-song-4', videoId: null,
    title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)',
    thumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=500&q=80',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=500&q=80',
    duration: 233, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', source: 'mock-fallback',
  },
  {
    id: 'mock-song-5', videoId: null,
    title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours',
    thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=500&q=80',
    cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=500&q=80',
    duration: 200, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', source: 'mock-fallback',
  },
  {
    id: 'mock-song-6', videoId: null,
    title: 'Cruel Summer', artist: 'Taylor Swift', album: 'Lover',
    thumbnail: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=500&q=80',
    cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=500&q=80',
    duration: 178, file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', source: 'mock-fallback',
  },
];

// ─── Service Class ────────────────────────────────────────────────────────────
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
    try {
      const { data } = await jioAxios.get('', {
        params: {
          __call: 'autocomplete.get',
          _format: 'json',
          _marker: '0',
          cc: 'in',
          includeMetaTags: '1',
          query,
        },
      });

      // 1. Check if there are direct song results (songs.data[])
      const directSongs = (data?.songs?.data || []).map(mapSong).filter(Boolean);
      if (directSongs.length > 0) {
        console.log(`JioSaavn autocomplete "${query}": found ${directSongs.length} direct songs`);
        return directSongs.slice(0, limit);
      }

      // 2. Check topquery for direct song matches
      const topQuerySongs = (data?.topquery?.data || [])
        .filter((s) => s.type === 'song')
        .map(mapSong)
        .filter(Boolean);
      if (topQuerySongs.length > 0) {
        console.log(`JioSaavn topquery "${query}": found ${topQuerySongs.length} songs`);
        return topQuerySongs.slice(0, limit);
      }

      // 3. Fallback: use the top album's songs via content.getAlbumDetails
      const albums = data?.albums?.data || [];
      if (albums.length > 0) {
        const topAlbum = albums[0];
        const albumId = topAlbum.id;
        console.log(`JioSaavn "${query}": no direct songs, fetching album ${albumId} songs`);

        const { data: albumData } = await jioAxios.get('', {
          params: {
            ...COMMON_PARAMS,
            __call: 'content.getAlbumDetails',
            albumid: albumId,
          },
        });

        // content.getAlbumDetails returns songs in 'list', not 'songs'
        const albumSongs = Array.isArray(albumData?.list)
          ? albumData.list.map(mapSong).filter(Boolean)
          : Array.isArray(albumData?.songs)
            ? albumData.songs.map(mapSong).filter(Boolean)
            : [];

        if (albumSongs.length > 0) {
          console.log(`JioSaavn album "${topAlbum.title}": found ${albumSongs.length} songs`);
          return albumSongs.slice(0, limit);
        }
      }

      throw new Error('No songs found in autocomplete or album');
    } catch (err) {
      console.warn(`JioSaavn searchSongs failed (query: "${query}"). Serving mock fallback. Error:`, err.message);
      const q = query.toLowerCase();
      const filtered = MOCK_FALLBACK_SONGS.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q)
      );
      return (filtered.length > 0 ? filtered : MOCK_FALLBACK_SONGS).slice(0, limit);
    }
  }

  /**
   * Get trending songs from JioSaavn charts.
   * Fetches chart playlists and gets songs from the top chart playlist.
   */
  async getTrendingSongs(limit = 20) {
    try {
      // Step 1: fetch chart playlists
      const { data: charts } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'content.getCharts',
          language: 'hindi',
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
        console.log(`JioSaavn trending: fetched ${songs.length} songs from chart "${topChart.title}"`);
        return songs;
      }

      throw new Error('Empty playlist');
    } catch (err) {
      console.warn('JioSaavn getTrendingSongs failed. Falling back to search.', err.message);
      // Fallback: search a popular query
      return this.searchSongs('bollywood hits 2025', limit);
    }
  }

  /**
   * Search artists
   */
  async searchArtist(query) {
    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getArtistResults',
          q: query,
          n: 1,
          p: 1,
        },
      });
      const results = data?.results || [];
      if (results.length === 0) throw new Error('No artists found');
      const a = results[0];
      return {
        id: a.id || a.artistid,
        name: a.name || a.title,
        image: getImageUrl(a.image),
        role: 'Artist',
        language: a.language || '',
      };
    } catch (err) {
      console.warn(`JioSaavn searchArtist failed ("${query}"). Mock fallback.`, err.message);
      const matched = MOCK_FALLBACK_SONGS.find((s) =>
        s.artist.toLowerCase().includes(query.toLowerCase())
      );
      return {
        id: matched ? `mock-artist-${matched.artist.toLowerCase().replace(/\s/g, '-')}` : 'mock-artist-arijit',
        name: matched ? matched.artist.split(',')[0].trim() : 'Arijit Singh',
        image: matched
          ? matched.thumbnail
          : 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=500&q=80',
        role: 'Artist',
        language: 'Hindi',
      };
    }
  }

  /**
   * Get artist details + top songs + albums
   */
  async getArtistDetails(artistId) {
    // Reject synthetic IDs from FederatedSearchService (not real JioSaavn IDs)
    if (!artistId || /^(artist-|mock-)/.test(String(artistId))) {
      return null;
    }
    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'artist.getArtistPageDetails',
          artistId,
          n_song: 10,
          n_album: 10,
          sub_type: '',
          category: '',
          sort_order: '',
          includeMetaTags: 0,
        },
      });
      const d = data?.artistDetails || data;
      if (!d || !d.artistId) throw new Error('No artist data');

      const image = getImageUrl(d.image);
      const songs = Array.isArray(d.topSongs?.songs)
        ? d.topSongs.songs.map(mapSong).filter(Boolean)
        : [];
      const albums = Array.isArray(d.topAlbums?.albums)
        ? d.topAlbums.albums.map((alb) => ({
            id: alb.id || alb.albumid,
            name: alb.name || alb.title,
            cover: getImageUrl(alb.image),
            year: alb.year || alb.release_date || '',
            type: 'Album',
            artist: d.name,
          }))
        : [];

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
      console.warn(`JioSaavn getArtistDetails failed (id: "${artistId}"). Mock fallback.`, err.message);
      return {
        artist: {
          id: artistId, name: 'Arijit Singh',
          image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=500&q=80',
          language: 'Hindi', role: 'Artist',
        },
        biography: {
          biography: 'Arijit Singh is an Indian playback singer and music composer.',
          listeners: 25000000,
          similarArtists: [
            { id: 'mock-artist-shreya', name: 'Shreya Ghoshal', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80' },
          ],
        },
        songs: MOCK_FALLBACK_SONGS,
        albums: [
          { id: 'mock-album-1', name: 'Brahmastra', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80', year: '2022', type: 'Movie Album', artist: 'Arijit Singh' },
        ],
      };
    }
  }

  /**
   * Get song details by a single song ID.
   * Returns full song with decrypted file_url.
   */
  async getSongDetails(songId) {
    const isArray = Array.isArray(songId);
    // song.getDetails only works reliably for a single ID
    const id = isArray ? (Array.isArray(songId) ? songId[0] : songId) : songId;

    if (!id || String(id).startsWith('mock-')) {
      return isArray ? [] : null;
    }

    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'song.getDetails',
          cc: 'in',
          pids: id,
        },
      });

      // Response: { songs: [...] }
      const songs = Array.isArray(data?.songs) ? data.songs : Object.values(data || {}).filter((s) => s && s.id);
      const mapped = songs.map(mapSong).filter(Boolean);

      if (mapped.length === 0) throw new Error('No songs returned');
      return isArray ? mapped : mapped[0];
    } catch (err) {
      console.warn(`JioSaavn getSongDetails failed (id: "${id}").`, err.message);
      return isArray ? [] : null;
    }
  }

  /**
   * Search albums
   */
  async searchAlbums(query, limit = 10) {
    try {
      const { data } = await jioAxios.get('', {
        params: {
          ...COMMON_PARAMS,
          __call: 'search.getAlbumResults',
          q: query,
          n: limit,
          p: 1,
        },
      });
      const results = data?.results || [];
      return results.map((alb) => ({
        id: alb.id || alb.albumid,
        name: alb.name || alb.title,
        artist: alb.music || alb.primary_artists || 'Unknown Artist',
        cover: getImageUrl(alb.image),
        year: alb.year || '',
        type: 'album',
        source: 'jiosaavn',
      }));
    } catch (err) {
      console.warn(`JioSaavn searchAlbums failed ("${query}"). Empty result.`, err.message);
      return [];
    }
  }

  /**
   * Get album details + songs
   */
  async getAlbumDetails(albumId) {
    // Reject synthetic IDs from FederatedSearchService (not real JioSaavn IDs)
    if (!albumId || /^(album-|mock-)/.test(String(albumId))) {
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
      if (!data || !data.id) throw new Error('No album data');
      // content.getAlbumDetails returns songs in 'list', not 'songs'
      const songList = Array.isArray(data.list) ? data.list
        : Array.isArray(data.songs) ? data.songs
        : [];
      const songs = songList.map(mapSong).filter(Boolean);
      return {
        id: data.id,
        name: data.title || data.name,
        artist: data.music || data.primary_artists || '',
        cover: getImageUrl(data.image),
        year: data.year || '',
        description: data.album_description || '',
        songs,
        source: 'jiosaavn',
      };
    } catch (err) {
      console.warn(`JioSaavn getAlbumDetails failed (id: "${albumId}"). Mock fallback.`, err.message);
      return {
        id: albumId,
        name: 'Album Details',
        artist: 'Various Artists',
        cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
        year: '2024',
        description: '',
        songs: MOCK_FALLBACK_SONGS,
        source: 'mock-fallback',
      };
    }
  }
}

module.exports = new JioSaavnService();
