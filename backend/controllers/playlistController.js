const Playlist = require('../models/Playlist');

exports.createPlaylist = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'Playlist name required' });
    }

    const result = await Playlist.create(userId, name, description || '');
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      description 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserPlaylists = async (req, res) => {
  try {
    const userId = req.userId;
    const playlists = await Playlist.findByUserId(userId);
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addSongToPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.body;

    if (!playlistId || !songId) {
      return res.status(400).json({ error: 'Playlist ID and Song ID required' });
    }

    await Playlist.addSongToPlaylist(playlistId, songId);
    res.json({ message: 'Song added to playlist' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Song already in this playlist' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.getPlaylistSongs = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const songs = await Playlist.getPlaylistSongs(playlistId);
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
