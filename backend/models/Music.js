const pool = require('../config/database');

class Music {
  static async create(title, artist, album, duration, fileUrl) {
    const connection = await pool.getConnection();
    
    try {
      const result = await connection.execute(
        'INSERT INTO songs (title, artist, album, duration, file_url) VALUES (?, ?, ?, ?, ?)',
        [title, artist, album, duration, fileUrl]
      );
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findAll(limit = 50, offset = 0) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM songs LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  static async search(query) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM songs WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?',
        [`%${query}%`, `%${query}%`, `%${query}%`]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  static async findById(songId) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM songs WHERE id = ?',
        [songId]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }
}

module.exports = Music;
