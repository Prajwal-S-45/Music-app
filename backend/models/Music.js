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
      const safeLimit = Number.isInteger(Number(limit)) ? Math.max(1, Math.min(200, Number(limit))) : 50;
      const safeOffset = Number.isInteger(Number(offset)) ? Math.max(0, Number(offset)) : 0;
      const [rows] = await connection.query(
        `SELECT * FROM songs LIMIT ${safeLimit} OFFSET ${safeOffset}`
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
