const roomStore = require('../services/roomStore');

exports.createRoom = (req, res) => {
  try {
    const { userName } = req.body || {};
    const room = roomStore.createRoom(userName || 'Host');

    res.status(201).json({
      message: 'Room created',
      room,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.joinRoom = (req, res) => {
  try {
    const { roomId } = req.body || {};

    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    const room = roomStore.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      message: 'Room found',
      room,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRoomState = (req, res) => {
  try {
    const { roomId } = req.params;
    const room = roomStore.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateRoomState = (req, res) => {
  try {
    const { roomId } = req.params;
    const { currentSong, isPlaying, currentTime } = req.body || {};

    const room = roomStore.updateRoomState(roomId, {
      currentSong,
      isPlaying,
      currentTime,
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      message: 'Room state updated',
      room,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
