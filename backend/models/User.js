const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(email, password, name) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();
    
    try {
      const result = await connection.execute(
        'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
        [email, hashedPassword, name]
      );
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findByEmail(email) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }

  static async findById(userId) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT id, name, email FROM users WHERE id = ?',
        [userId]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }
}

module.exports = User;
