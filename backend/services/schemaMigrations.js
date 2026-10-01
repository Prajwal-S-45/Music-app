const pool = require('../config/database');

const ensureColumnType = async (connection, tableName, columnName, columnDefinition) => {
  const [rows] = await connection.execute(
    `SELECT DATA_TYPE, COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (rows.length === 0) {
    return;
  }

  const currentType = String(rows[0].COLUMN_TYPE || '').toLowerCase();
  if (currentType.startsWith('varchar(')) {
    return;
  }

  const [foreignKeys] = await connection.execute(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName, columnName]
  );

  for (const foreignKey of foreignKeys) {
    await connection.execute(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${foreignKey.CONSTRAINT_NAME}\``);
  }

  await connection.execute(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` ${columnDefinition}`);
};

const ensureLikedSongsTimestampColumn = async (connection) => {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'liked_songs'
       AND COLUMN_NAME IN ('liked_at', 'created_at')`
  );

  const hasLikedAt = rows.some((row) => row.COLUMN_NAME === 'liked_at');
  if (!hasLikedAt) {
    await connection.execute(
      `ALTER TABLE liked_songs ADD COLUMN liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    );
  }
};

const ensureColumnExists = async (connection, tableName, columnName, columnDefinition) => {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (rows.length > 0) {
    return;
  }

  try {
    await connection.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      throw err;
    }
  }
};

const ensureLikedSongsMetadataColumns = async (connection) => {
  await ensureColumnExists(connection, 'liked_songs', 'title', 'VARCHAR(255)');
  await ensureColumnExists(connection, 'liked_songs', 'artist', 'VARCHAR(255)');
  await ensureColumnExists(connection, 'liked_songs', 'album', 'VARCHAR(255)');
  await ensureColumnExists(connection, 'liked_songs', 'thumbnail', 'VARCHAR(500)');
  await ensureColumnExists(connection, 'liked_songs', 'duration', 'INT');
  await ensureColumnExists(connection, 'liked_songs', 'source', 'VARCHAR(64)');
};

const ensureHistoryTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS history_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      type ENUM('song', 'search', 'artist', 'album', 'playlist') NOT NULL,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255),
      image VARCHAR(500),
      target VARCHAR(500),
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_history_user_created (user_id, created_at),
      INDEX idx_history_type (type)
    )
  `);
};

const ensureLikedAlbumsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS liked_albums (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      album_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      artist VARCHAR(255) NOT NULL,
      cover TEXT,
      year VARCHAR(20),
      type VARCHAR(50),
      liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_album (user_id, album_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_liked_album_id (album_id)
    )
  `);
};

const ensureExternalMusicSchema = async () => {
  const connection = await pool.getConnection();

  try {
    await ensureColumnType(connection, 'liked_songs', 'song_id', 'VARCHAR(64) NOT NULL');
    await ensureColumnType(connection, 'playlist_songs', 'song_id', 'VARCHAR(64) NOT NULL');
    await ensureLikedSongsTimestampColumn(connection);
    await ensureLikedSongsMetadataColumns(connection);
    await ensureHistoryTable(connection);
    await ensureLikedAlbumsTable(connection);
  } finally {
    connection.release();
  }
};

module.exports = {
  ensureExternalMusicSchema,
};
