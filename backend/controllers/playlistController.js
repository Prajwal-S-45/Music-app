const Playlist = require('../models/Playlist');
const jioSaavnService = require('../services/JioSaavnService');

const mapFallbackSong = (songId) => ({
  id: songId,
  videoId: null,
  title: 'Unavailable Song',
  thumbnail: null,
  artist: 'Unknown Artist',
  source: 'jiosaavn',
  playable: false,
});


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
    const songIds = rows.map((row) => row.song_id);

    let detailedSongs = [];
    if (songIds.length > 0) {
      try {
        detailedSongs = await jioSaavnService.getSongDetails(songIds);
      } catch (error) {
        console.warn('Could not fetch JioSaavn metadata for playlist songs:', error.message);
      }
    }

    const songsById = new Map(detailedSongs.map((song) => [song.id, song]));
    const songs = songIds.map((songId) => songsById.get(songId) || mapFallbackSong(songId));

    res.json({
      success: true,
      data: songs.filter(Boolean),
      total: songs.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
