const Playlist = require('../models/Playlist');
const jamendoService = require('../services/jamendoService');

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
    const userId = req.userId;

    if (!playlistId || !songId) {
      return res.status(400).json({ error: 'Playlist ID and Song ID required' });
    }

    const playlist = await Playlist.findByIdAndUserId(playlistId, userId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found for this user' });
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

exports.removeSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.body;
    const userId = req.userId;

    if (!playlistId || !songId) {
      return res.status(400).json({ error: 'Playlist ID and Song ID required' });
    }

    const playlist = await Playlist.findByIdAndUserId(playlistId, userId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found for this user' });
    }

    const result = await Playlist.removeSongFromPlaylist(playlistId, songId);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Song not found in playlist' });
    }

    res.json({ message: 'Song removed from playlist' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPlaylistSongs = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.userId;

    const playlist = await Playlist.findByIdAndUserId(playlistId, userId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found for this user' });
    }

    const rows = await Playlist.getPlaylistSongs(playlistId);
    const songs = await Promise.all(
      rows.map(async (row) => {
        try {
          return await jamendoService.getSongById(row.song_id);
        } catch (error) {
          return {
            id: row.song_id,
            title: 'Unknown Title',
            artist: 'Unknown Artist',
            source: 'jamendo',
          };
        }
      })
    );

    res.json({
      success: true,
      data: songs.filter(Boolean),
      total: songs.filter(Boolean).length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
