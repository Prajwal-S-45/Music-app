const pool = require('../config/database');

class Playlist {
  static async create(userId, name, description = '') {
    const connection = await pool.getConnection();
    
    try {
      const result = await connection.execute(
        'INSERT INTO playlists (user_id, name, description) VALUES (?, ?, ?)',
        [userId, name, description]
      );
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findByUserId(userId) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM playlists WHERE user_id = ?',
        [userId]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  static async addSongToPlaylist(playlistId, songId) {
    const connection = await pool.getConnection();
    
    try {
      const result = await connection.execute(
        'INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)',
        [playlistId, songId]
      );
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async removeSongFromPlaylist(playlistId, songId) {
    const connection = await pool.getConnection();

    try {
      const result = await connection.execute(
        'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
        [playlistId, songId]
      );
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findByIdAndUserId(playlistId, userId) {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        'SELECT * FROM playlists WHERE id = ? AND user_id = ?',
        [playlistId, userId]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }

  static async getPlaylistSongs(playlistId) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY added_at DESC',
        [playlistId]
      );
      return rows;
    } finally {
      connection.release();
    }
  }
}

module.exports = Playlist;
