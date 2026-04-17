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

-- Sample Songs (Optional)
INSERT INTO songs (title, artist, album, duration) VALUES
('Song One', 'Artist A', 'Album 1', 180),
('Song Two', 'Artist B', 'Album 2', 210),
('Song Three', 'Artist C', 'Album 1', 195),
('Song Four', 'Artist A', 'Album 3', 165),
('Song Five', 'Artist D', 'Album 4', 200);
