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

const ensureJamendoCompatibleSchema = async () => {
  const connection = await pool.getConnection();

  try {
    await ensureColumnType(connection, 'liked_songs', 'song_id', 'VARCHAR(64) NOT NULL');
    await ensureColumnType(connection, 'playlist_songs', 'song_id', 'VARCHAR(64) NOT NULL');
    await ensureLikedSongsTimestampColumn(connection);
  } finally {
    connection.release();
  }
};

module.exports = {
  ensureJamendoCompatibleSchema,
};