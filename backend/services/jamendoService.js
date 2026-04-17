const axios = require('axios');

const JAMENDO_BASE_URL = 'https://api.jamendo.com/v3.0';
// IMPORTANT: Get your own client ID from https://developer.jamendo.com
// Free tier available - register and get YOUR_CLIENT_ID
// Current placeholder will not work until replaced with a valid ID
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID || 'YOUR_JAMENDO_CLIENT_ID';

// Create axios instance for Jamendo API
const jamendoClient = axios.create({
  baseURL: JAMENDO_BASE_URL,
  timeout: 10000,
});

/**
 * Format song data from Jamendo API to app format
 */
const formatJamendoSong = (jamendoSong) => ({
  id: jamendoSong.id,
  title: jamendoSong.name || 'Unknown Title',
  artist: jamendoSong.artist_name || 'Unknown Artist',
  album: jamendoSong.album_name || 'Unknown Album',
  image: jamendoSong.image || null,
  duration: jamendoSong.duration || 0,
  file_url: jamendoSong.audio || null,
  album_id: jamendoSong.album_id || null,
  artist_id: jamendoSong.artist_id || null,
  license: jamendoSong.license || 'Creative Commons',
  loves: jamendoSong.loves_count || 0,
  source: 'jamendo',
  createdAt: new Date(),
  updatedAt: new Date(),
});

/**
 * Fetch trending/popular songs
 * @param {number} limit - Number of songs to fetch (default: 50)
 * @param {number} offset - Pagination offset (default: 0)
 * @returns {Promise<Array>} Array of formatted songs
 */
const getTrendingSongs = async (limit = 50, offset = 0) => {
  try {
    const response = await jamendoClient.get('/tracks', {
      params: {
        client_id: CLIENT_ID,
        format: 'json',
        limit: Math.min(limit, 200), // API max is 200
        offset: offset,
        order: 'popularity_month', // Trending/popular songs
        audioformat: 'mp3', // MP3 format
        imagesize: 200, // Album art size
        include: 'licenses',
      },
    });

    const songs = response.data.results || [];
    return songs.map(formatJamendoSong);
  } catch (error) {
    console.error('Error fetching trending songs from Jamendo:', error.message);
    throw new Error(`Failed to fetch trending songs: ${error.message}`);
  }
};

/**
 * Search songs by query
 * @param {string} query - Search query
 * @param {number} limit - Number of results (default: 50)
 * @returns {Promise<Array>} Array of formatted songs
 */
const searchSongs = async (query, limit = 50) => {
  try {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const response = await jamendoClient.get('/tracks', {
      params: {
        client_id: CLIENT_ID,
        format: 'json',
        search: query.trim(),
        limit: Math.min(limit, 200),
        audioformat: 'mp3',
        imagesize: 200,
        include: 'licenses',
      },
    });

    const songs = response.data.results || [];
    return songs.map(formatJamendoSong);
  } catch (error) {
    console.error('Error searching songs from Jamendo:', error.message);
    throw new Error(`Failed to search songs: ${error.message}`);
  }
};

/**
 * Get song details by ID
 * @param {string} songId - Jamendo song ID
 * @returns {Promise<Object>} Formatted song object
 */
const getSongById = async (songId) => {
  try {
    if (!songId) {
      throw new Error('Song ID is required');
    }

    const response = await jamendoClient.get('/tracks', {
      params: {
        client_id: CLIENT_ID,
        format: 'json',
        id: songId,
        audioformat: 'mp3',
        imagesize: 200,
        include: 'licenses',
      },
    });

    const songs = response.data.results || [];
    if (songs.length === 0) {
      return null;
    }

    return formatJamendoSong(songs[0]);
  } catch (error) {
    console.error('Error fetching song by ID from Jamendo:', error.message);
    throw new Error(`Failed to fetch song: ${error.message}`);
  }
};

/**
 * Get songs by artist
 * @param {string} artistId - Jamendo artist ID
 * @param {number} limit - Number of results (default: 50)
 * @returns {Promise<Array>} Array of formatted songs
 */
const getSongsByArtist = async (artistId, limit = 50) => {
  try {
    if (!artistId) {
      throw new Error('Artist ID is required');
    }

    const response = await jamendoClient.get('/tracks', {
      params: {
        client_id: CLIENT_ID,
        format: 'json',
        artist_id: artistId,
        limit: Math.min(limit, 200),
        audioformat: 'mp3',
        imagesize: 200,
      },
    });

    const songs = response.data.results || [];
    return songs.map(formatJamendoSong);
  } catch (error) {
    console.error('Error fetching songs by artist:', error.message);
    throw new Error(`Failed to fetch artist songs: ${error.message}`);
  }
};

/**
 * Get songs by album
 * @param {string} albumId - Jamendo album ID
 * @returns {Promise<Array>} Array of formatted songs
 */
const getSongsByAlbum = async (albumId) => {
  try {
    if (!albumId) {
      throw new Error('Album ID is required');
    }

    const response = await jamendoClient.get('/tracks', {
      params: {
        client_id: CLIENT_ID,
        format: 'json',
        album_id: albumId,
        audioformat: 'mp3',
        imagesize: 200,
      },
    });

    const songs = response.data.results || [];
    return songs.map(formatJamendoSong);
  } catch (error) {
    console.error('Error fetching songs by album:', error.message);
    throw new Error(`Failed to fetch album songs: ${error.message}`);
  }
};

module.exports = {
  getTrendingSongs,
  searchSongs,
  getSongById,
  getSongsByArtist,
  getSongsByAlbum,
};
