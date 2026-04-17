const Music = require('../models/Music');
const pool = require('../config/database');

const formatSong = (song) => {
  if (!song) return song;

  if (song.file_url && song.file_url.startsWith('/')) {
    return {
      ...song,
      file_url: `http://localhost:${process.env.PORT || 5000}${song.file_url}`,
    };
  }

  return song;
};

exports.getAllSongs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const songs = await Music.findAll(limit, offset);
    res.json(songs.map(formatSong));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchSongs = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const songs = await Music.search(query);
    res.json(songs.map(formatSong));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSongById = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await Music.findById(id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json(formatSong(song));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.likeSong = async (req, res) => {
  try {
    const { songId } = req.body;
    const userId = req.userId;

    const connection = await pool.getConnection();
    
    try {
      await connection.execute(
        'INSERT INTO liked_songs (user_id, song_id) VALUES (?, ?)',
        [userId, songId]
      );
      res.json({ message: 'Song liked' });
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Already liked' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.getLikedSongs = async (req, res) => {
  try {
    const userId = req.userId;

    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT s.* FROM songs s INNER JOIN liked_songs ls ON s.id = ls.song_id WHERE ls.user_id = ?',
        [userId]
      );
      res.json(rows.map(formatSong));
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.uploadSong = async (req, res) => {
  try {
    const { title, artist, album, duration } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Song file is required' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const parsedDuration = Number.isFinite(Number(duration)) ? Number(duration) : 0;
    const result = await Music.create(title, artist, album || '', parsedDuration, fileUrl);

    res.status(201).json({
      message: 'Song uploaded successfully',
      song: {
        id: result.insertId,
        title,
        artist,
        album: album || '',
        duration: parsedDuration,
        file_url: `http://localhost:${process.env.PORT || 5000}${fileUrl}`,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
