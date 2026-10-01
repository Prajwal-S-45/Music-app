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
        // Ensure UNIQUE constraint on artist_id for artist_images and artist_biographies
        try {
          const [imagesIndexes] = await connection.query("SHOW INDEX FROM artist_images WHERE Column_name = 'artist_id' AND Non_unique = 0");
          if (imagesIndexes.length === 0) {
            await connection.query("ALTER TABLE artist_images ADD UNIQUE KEY unique_artist_images_id (artist_id);");
            console.log("Added UNIQUE key on artist_id in artist_images table.");
          }
        } catch (err) {
          console.error("Could not add UNIQUE key on artist_images:", err);
        }

        try {
          const [bioIndexes] = await connection.query("SHOW INDEX FROM artist_biographies WHERE Column_name = 'artist_id' AND Non_unique = 0");
          if (bioIndexes.length === 0) {
            await connection.query("ALTER TABLE artist_biographies ADD UNIQUE KEY unique_artist_biographies_id (artist_id);");
            console.log("Added UNIQUE key on artist_id in artist_biographies table.");
          }
        } catch (err) {
          console.error("Could not add UNIQUE key on artist_biographies:", err);
        }

        // Initialize recommendation system tables
        await this.initializeRecommendationTables(connection);

        console.log('Database schema initialized successfully.');
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error;
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
    await this.pool.execute(query, [
      artistId,
      thumbnail || null,
      banner || null,
      fanart || null,
      logo || null,
      wide_thumb || null
    ]);
  }

  async getArtistImages(artistId) {
    const [rows] = await this.pool.execute('SELECT * FROM artist_images WHERE artist_id = ?', [artistId]);
    return rows[0] || null;
  }

  async saveArtistBiography(artistId, bioData) {
    const { biography, listeners, playcount } = bioData;
    const query = `
      INSERT INTO artist_biographies (artist_id, biography, listeners, playcount)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      biography = VALUES(biography), listeners = VALUES(listeners), playcount = VALUES(playcount)
    `;
    await this.pool.execute(query, [
      artistId,
      biography || null,
      listeners || 0,
      playcount || 0
    ]);
  }

  async getArtistBiography(artistId) {
    const [rows] = await this.pool.execute('SELECT * FROM artist_biographies WHERE artist_id = ?', [artistId]);
    return rows[0] || null;
  }

  // --- Recommendation System Methods ---

  async initializeRecommendationTables(connection) {
    try {
      // Create song_popularity table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS song_popularity (
          id INT PRIMARY KEY AUTO_INCREMENT,
          song_id VARCHAR(64) NOT NULL UNIQUE,
          play_count BIGINT NOT NULL DEFAULT 0,
          last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_song_popularity_count (play_count DESC)
        )
      `);

      // Create user_play_history table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_play_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          song_id VARCHAR(64) NOT NULL,
          event_type ENUM('play', 'like', 'skip', 'pause', 'complete') NOT NULL DEFAULT 'play',
          occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_history_user (user_id, occurred_at),
          INDEX idx_user_history_song (song_id),
          INDEX idx_user_history_user_song (user_id, song_id)
        )
      `);

      // Add indexes on liked_songs for content-based filtering
      try {
        await connection.query(`CREATE INDEX idx_liked_songs_artist ON liked_songs(artist)`);
        await connection.query(`CREATE INDEX idx_liked_songs_album ON liked_songs(album)`);
      } catch (indexError) {
        console.log('Indexes on liked_songs may already exist:', indexError.message);
      }

      console.log('Recommendation system tables initialized.');
    } catch (error) {
      console.error('Error initializing recommendation tables:', error);
    }
  }

  async incrementSongPlayCount(songId) {
    const query = `
      INSERT INTO song_popularity (song_id, play_count, last_played)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        play_count = play_count + 1,
        last_played = CURRENT_TIMESTAMP
    `;
    await this.pool.execute(query, [songId]);
  }

  async addPlayHistory(userId, songId, eventType = 'play') {
    const query = `
      INSERT INTO user_play_history (user_id, song_id, event_type)
      VALUES (?, ?, ?)
    `;
    await this.pool.execute(query, [userId, songId, eventType]);
  }

  async getUserHistory(userId, limit = 50) {
    const [rows] = await this.pool.execute(
      `SELECT song_id, event_type, occurred_at
       FROM user_play_history
       WHERE user_id = ?
       ORDER BY occurred_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }

  async getPopularSongs(limit = 20) {
    const [rows] = await this.pool.execute(
      `SELECT song_id, play_count, last_played
       FROM song_popularity
       ORDER BY play_count DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

}

module.exports = new DatabaseService();
