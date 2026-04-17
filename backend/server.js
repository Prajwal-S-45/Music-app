const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const musicRoutes = require('./routes/musicRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const roomRoutes = require('./routes/roomRoutes');
const roomStore = require('./services/roomStore');
const { ensureJamendoCompatibleSchema } = require('./services/schemaMigrations');

const app = express();
const server = http.createServer(app);
const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return configuredOrigins.includes(origin);
};

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/rooms', roomRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

const io = new Server(server, {
  cors: {
    origin: configuredOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const emitRoomState = (roomId) => {
  const room = roomStore.getRoom(roomId);
  if (!room) {
    return;
  }

  io.to(roomId).emit('room_state', {
    roomId: room.roomId,
    hostSocketId: room.hostSocketId,
    currentSong: room.currentSong,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime,
    members: room.members,
    updatedAt: room.updatedAt,
  });
};

const emitRoomTimeSync = (roomId) => {
  const room = roomStore.getRoomSnapshot(roomId);
  if (!room) {
    return;
  }

  io.to(roomId).emit('room_sync', room);
};

const isSocketInRoom = (room, socketId) => {
  return room?.members?.some((member) => member.socketId === socketId);
};

const syncRoomEvent = (socket, roomId, eventName, statePatch = {}, extraPayload = {}) => {
  const normalizedRoomId = String(roomId || '').trim();
  const room = roomStore.getRoom(normalizedRoomId);

  if (!room || !isSocketInRoom(room, socket.id)) {
    return;
  }

  const updatedRoom = roomStore.updateRoomState(normalizedRoomId, statePatch);
  if (!updatedRoom) {
    return;
  }

  io.to(normalizedRoomId).emit(eventName, {
    roomId: normalizedRoomId,
    currentSong: updatedRoom.currentSong,
    isPlaying: updatedRoom.isPlaying,
    currentTime: updatedRoom.currentTime,
    serverTime: Date.now(),
    fromSocketId: socket.id,
    at: updatedRoom.updatedAt,
    ...extraPayload,
  });

  emitRoomState(normalizedRoomId);
};

const leaveRoom = (socket, roomId) => {
  const room = roomStore.leaveSocketFromRoom(roomId, socket.id);

  if (!room) {
    return;
  }

  socket.leave(roomId);

  if (room.deleted) {
    return;
  }
  emitRoomState(roomId);
};

io.on('connection', (socket) => {
  socket.on('create_room', ({ userName }) => {
    const room = roomStore.createRoom(userName || 'Host');
    const joinedRoom = roomStore.joinSocketToRoom(room.roomId, socket.id, userName || 'Host');

    socket.join(room.roomId);
    socket.emit('room_created', joinedRoom);
    emitRoomState(room.roomId);
  });

  socket.on('join_room', ({ roomId, userName }) => {
    const normalizedRoomId = String(roomId || '').trim();

    if (!normalizedRoomId) {
      socket.emit('room_error', { message: 'Room id is required.' });
      return;
    }

    const room = roomStore.joinSocketToRoom(normalizedRoomId, socket.id, userName || 'Listener');
    if (!room) {
      socket.emit('room_error', { message: 'Room not found.' });
      return;
    }

    socket.join(normalizedRoomId);
    socket.emit('joined_room', {
      roomId: normalizedRoomId,
      hostSocketId: room.hostSocketId,
      userSocketId: socket.id,
    });

    emitRoomState(normalizedRoomId);
  });

  socket.on('leave_room', ({ roomId }) => {
    leaveRoom(socket, String(roomId || '').trim());
  });

  socket.on('play', ({ roomId, currentSong, currentTime }) => {
    syncRoomEvent(
      socket,
      roomId,
      'play',
      {
        currentSong: currentSong || null,
        isPlaying: true,
        currentTime: typeof currentTime === 'number' ? currentTime : 0,
      }
    );
  });

  socket.on('pause', ({ roomId, currentTime }) => {
    syncRoomEvent(
      socket,
      roomId,
      'pause',
      {
        isPlaying: false,
        currentTime: typeof currentTime === 'number' ? currentTime : 0,
      }
    );
  });

  socket.on('change_song', ({ roomId, currentSong, currentTime = 0, isPlaying = true }) => {
    if (!currentSong) {
      return;
    }

    syncRoomEvent(
      socket,
      roomId,
      'change_song',
      {
        currentSong,
        currentTime: typeof currentTime === 'number' ? currentTime : 0,
        isPlaying: Boolean(isPlaying),
      }
    );
  });

  socket.on('seek', ({ roomId, currentTime }) => {
    if (typeof currentTime !== 'number') {
      return;
    }

    syncRoomEvent(
      socket,
      roomId,
      'seek',
      {
        currentTime,
      }
    );
  });

  socket.on('playback_update', ({ roomId, action, song, currentSong, currentTime, isPlaying }) => {
    const normalizedRoomId = String(roomId || '').trim();

    if (action === 'play') {
      syncRoomEvent(socket, normalizedRoomId, 'play', {
        currentSong: currentSong || song || null,
        isPlaying: true,
        currentTime: typeof currentTime === 'number' ? currentTime : 0,
      });
      return;
    }

    if (action === 'pause') {
      syncRoomEvent(socket, normalizedRoomId, 'pause', {
        isPlaying: false,
        currentTime: typeof currentTime === 'number' ? currentTime : 0,
      });
      return;
    }

    if (currentSong || song) {
      syncRoomEvent(socket, normalizedRoomId, 'change_song', {
        currentSong: currentSong || song,
        currentTime: typeof currentTime === 'number' ? currentTime : 0,
        isPlaying: typeof isPlaying === 'boolean' ? isPlaying : true,
      });
    }
  });

  socket.on('request_room_state', ({ roomId }) => {
    const normalizedRoomId = String(roomId || '').trim();
    if (roomStore.getRoom(normalizedRoomId)) {
      emitRoomState(normalizedRoomId);
      emitRoomTimeSync(normalizedRoomId);
    }
  });

  socket.on('disconnect', () => {
    const joinedRoomIds = roomStore.getJoinedRoomsBySocket(socket.id);
    for (const roomId of joinedRoomIds) {
      leaveRoom(socket, roomId);
    }
  });
});

setInterval(() => {
  for (const roomId of roomStore.getAllRoomIds()) {
    const snapshot = roomStore.getRoomSnapshot(roomId);

    if (!snapshot || !snapshot.isPlaying) {
      continue;
    }

    io.to(roomId).emit('room_sync', snapshot);
  }
}, 2500);

// Start server
const BASE_PORT = Number(process.env.PORT) || 5000;
const PORT_FALLBACK_ATTEMPTS = Math.max(1, Number(process.env.PORT_FALLBACK_ATTEMPTS) || 5);

const listenWithFallback = (startPort, maxAttempts) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryListen = (port) => {
      const onError = (error) => {
        server.off('listening', onListening);

        const hasMoreAttempts = attempts + 1 < maxAttempts;
        if (error.code === 'EADDRINUSE' && hasMoreAttempts) {
          attempts += 1;
          const nextPort = port + 1;
          console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
          setTimeout(() => tryListen(nextPort), 120);
          return;
        }

        reject(error);
      };

      const onListening = () => {
        server.off('error', onError);
        resolve(port);
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port);
    };

    tryListen(startPort);
  });
};

const startServer = async () => {
  try {
    await ensureJamendoCompatibleSchema();
    const activePort = await listenWithFallback(BASE_PORT, PORT_FALLBACK_ATTEMPTS);
    if (activePort !== BASE_PORT) {
      console.log(`🎵 Music App Backend running on fallback port ${activePort} (preferred ${BASE_PORT})`);
      return;
    }

    console.log(`🎵 Music App Backend running on port ${activePort}`);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      const lastTriedPort = BASE_PORT + PORT_FALLBACK_ATTEMPTS - 1;
      console.error(`Ports ${BASE_PORT}-${lastTriedPort} are in use. Stop the process using those ports or change PORT in backend/.env.`);
    } else {
      console.error('Failed to start backend:', error);
    }
    process.exit(1);
  }
};

startServer();
