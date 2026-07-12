-- Create Database
CREATE DATABASE IF NOT EXISTS music_app;
USE music_app;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Songs Table
CREATE TABLE IF NOT EXISTS songs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  duration INT,
  file_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Playlists Table
CREATE TABLE IF NOT EXISTS playlists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Playlist Songs Table (Junction)
CREATE TABLE IF NOT EXISTS playlist_songs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  playlist_id INT NOT NULL,
  song_id VARCHAR(64) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_playlist_song (playlist_id, song_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  INDEX idx_playlist_song_id (song_id)
);

-- Liked Songs Table
CREATE TABLE IF NOT EXISTS liked_songs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  song_id VARCHAR(64) NOT NULL,
  title VARCHAR(255),
  artist VARCHAR(255),
  album VARCHAR(255),
  thumbnail VARCHAR(500),
  duration INT,
  source VARCHAR(64),
  liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_song (user_id, song_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_liked_song_id (song_id)
);

-- Shared Listening Rooms
CREATE TABLE IF NOT EXISTS listening_rooms (
  id VARCHAR(64) PRIMARY KEY,
  created_by INT NOT NULL,
  current_song_id VARCHAR(64) NULL,
  is_playing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_current_song_id (current_song_id)
);

CREATE TABLE IF NOT EXISTS listening_room_members (
  room_id VARCHAR(64) NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES listening_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Activity History
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
);

-- Sample Songs (Optional)
INSERT INTO songs (title, artist, album, duration) VALUES
('Song One', 'Artist A', 'Album 1', 180),
('Song Two', 'Artist B', 'Album 2', 210),
('Song Three', 'Artist C', 'Album 1', 195),
('Song Four', 'Artist A', 'Album 3', 165),
('Song Five', 'Artist D', 'Album 4', 200);

-- === JIOSAAVN METADATA LAYER ===

CREATE TABLE IF NOT EXISTS artists (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(50),
  type VARCHAR(50),
  begin_date VARCHAR(20),
  genre VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS artist_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  artist_id VARCHAR(255) NOT NULL,
  thumbnail TEXT,
  banner TEXT,
  fanart TEXT,
  logo TEXT,
  wide_thumb TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artist_biographies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  artist_id VARCHAR(255) NOT NULL,
  biography TEXT,
  listeners INT DEFAULT 0,
  playcount INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS albums (
  id VARCHAR(255) PRIMARY KEY,
  artist_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  release_date VARCHAR(20),
  album_type VARCHAR(50),
  thumbnail TEXT,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tracks (
  id VARCHAR(255) PRIMARY KEY,
  album_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  duration INT DEFAULT 0,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS lyrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  track_id VARCHAR(255) NOT NULL,
  lyrics TEXT,
  synced_lyrics JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
