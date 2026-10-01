const CacheService = require('./CacheService');
const db = require('../config/database');

const POPULAR_TTL_SECONDS = 6 * 60 * 60; // Cache for 6 hours
const POPULAR_CACHE_KEY_PREFIX = 'popular_songs';

async function initializePopularityTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS song_popularity (
        song_id VARCHAR(64) PRIMARY KEY,
        play_count BIGINT NOT NULL DEFAULT 0,
        last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Song popularity table ensured');
  } catch (error) {
    console.error('Error initializing popularity table:', error);
  }
}

// Initialize table on module load
initializePopularityTable();

/**
 * Track a song play event (increment popularity)
 * @param {string} songId - Unique song identifier
 * @param {string} userId - User ID who played the song
 */
async function trackSongPlay(songId, userId = null) {
  try {
    // Upsert: insert if not exists, increment play_count if exists
    await db.query(`
      INSERT INTO song_popularity (song_id, play_count, last_played)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        play_count = play_count + 1,
        last_played = CURRENT_TIMESTAMP
    `, [songId]);

    // Invalidate cache for popular songs since data changed
    // Note: delByPattern not available, so we clear the specific key
    await CacheService.delete(`${POPULAR_CACHE_KEY_PREFIX}_*`);

  } catch (error) {
    console.error('Error tracking song play:', error);
    throw error;
  }
}

/**
 * Get top popular songs
 * @param {number} limit - Maximum number of songs to return (default 20)
 * @param {string} region - Optional region filter (future use)
 * @returns {Promise<Array>} Array of popular song objects
 */
async function getTopSongs(limit = 20, region = 'global') {
  try {
    const cacheKey = `${POPULAR_CACHE_KEY_PREFIX}_${region}_${limit}`;
    const cached = await CacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const [rows] = await db.query(
      `SELECT song_id, play_count
       FROM song_popularity
       ORDER BY play_count DESC
       LIMIT ?`,
      [limit]
    );

    const result = rows.map(row => ({
      id: row.song_id,
      playCount: row.play_count
    }));

    // Cache the result
    await CacheService.set(cacheKey, result, POPULAR_TTL_SECONDS);
    return result;
  } catch (error) {
    console.error('Error getting top songs:', error);
    throw error;
  }
}

/**
 * Clear popularity cache (useful for admin functions)
 */
async function clearPopularityCache() {
  await CacheService.delete(`${POPULAR_CACHE_KEY_PREFIX}_*`);
}

module.exports = {
  trackSongPlay,
  getTopSongs,
  clearPopularityCache,
  initializePopularityTable
};