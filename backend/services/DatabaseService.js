const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

class DatabaseService {
  constructor() {
    this.pool = pool;
  }

  async initializeSchema() {
    try {
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      
      const statements = sql
        .split(';')
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

      const connection = await this.pool.getConnection();
      try {
        for (const statement of statements) {
          await connection.query(statement);
        }
        
        // Add new columns to users table if they don't exist
        const [columns] = await connection.query("SHOW COLUMNS FROM users");
        const columnNames = columns.map(c => c.Field);
        
        if (!columnNames.includes('bio')) {
          await connection.query("ALTER TABLE users ADD COLUMN bio TEXT NULL;");
          console.log("Added 'bio' column to users table.");
        }
        if (!columnNames.includes('avatar')) {
          await connection.query("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL;");
          console.log("Added 'avatar' column to users table.");
        }
        if (!columnNames.includes('plan')) {
          await connection.query("ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'Free Plan';");
          console.log("Added 'plan' column to users table.");
        }

        // Copy generated avatar to uploads directory
        try {
          const fs = require('fs');
          const path = require('path');
          const srcPath = 'C:\\Users\\Prajwal S A\\.gemini\\antigravity-ide\\brain\\63083da0-a69d-49b4-bff1-0a854f5a1232\\profile_avatar_prajwal_1783576674045.png';
          const destPath = path.join(__dirname, '../uploads/profile_avatar.png');
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log("Successfully copied generated avatar to uploads directory.");
          }
        } catch (copyErr) {
          console.error("Failed to copy avatar:", copyErr);
        }

        console.log('Database schema initialized successfully.');
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error initializing database schema:', error);
    }
  }

  // --- Artist Methods ---

  async saveArtist(artistData) {
    const { id, name, country, type, begin_date, genre } = artistData;
    const query = `
      INSERT INTO artists (id, name, country, type, begin_date, genre)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name = VALUES(name), country = VALUES(country), type = VALUES(type), begin_date = VALUES(begin_date), genre = VALUES(genre)
    `;
    await this.pool.execute(query, [id, name, country || null, type || null, begin_date || null, genre || null]);
  }

  async getArtist(id) {
    const [rows] = await this.pool.execute('SELECT * FROM artists WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async saveArtistImages(artistId, images) {
    const { thumbnail, banner, fanart, logo, wide_thumb } = images;
    const query = `
      INSERT INTO artist_images (artist_id, thumbnail, banner, fanart, logo, wide_thumb)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      thumbnail = VALUES(thumbnail), banner = VALUES(banner), fanart = VALUES(fanart), logo = VALUES(logo), wide_thumb = VALUES(wide_thumb)
    `;
    // We need to handle ON DUPLICATE KEY correctly for non-unique constraint, so let's check first or use INSERT/UPDATE
    const [existing] = await this.pool.execute('SELECT id FROM artist_images WHERE artist_id = ?', [artistId]);
    if (existing.length > 0) {
        await this.pool.execute(`
            UPDATE artist_images 
            SET thumbnail=?, banner=?, fanart=?, logo=?, wide_thumb=? 
            WHERE artist_id=?`,
            [thumbnail || null, banner || null, fanart || null, logo || null, wide_thumb || null, artistId]
        );
    } else {
        await this.pool.execute(`
            INSERT INTO artist_images (artist_id, thumbnail, banner, fanart, logo, wide_thumb)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [artistId, thumbnail || null, banner || null, fanart || null, logo || null, wide_thumb || null]
        );
    }
  }

  async getArtistImages(artistId) {
    const [rows] = await this.pool.execute('SELECT * FROM artist_images WHERE artist_id = ?', [artistId]);
    return rows[0] || null;
  }

  async saveArtistBiography(artistId, bioData) {
    const { biography, listeners, playcount } = bioData;
    
    const [existing] = await this.pool.execute('SELECT id FROM artist_biographies WHERE artist_id = ?', [artistId]);
    if (existing.length > 0) {
        await this.pool.execute(`
            UPDATE artist_biographies 
            SET biography=?, listeners=?, playcount=? 
            WHERE artist_id=?`,
            [biography || null, listeners || 0, playcount || 0, artistId]
        );
    } else {
        await this.pool.execute(`
            INSERT INTO artist_biographies (artist_id, biography, listeners, playcount)
            VALUES (?, ?, ?, ?)`,
            [artistId, biography || null, listeners || 0, playcount || 0]
        );
    }
  }

  async getArtistBiography(artistId) {
    const [rows] = await this.pool.execute('SELECT * FROM artist_biographies WHERE artist_id = ?', [artistId]);
    return rows[0] || null;
  }

}

module.exports = new DatabaseService();
