const crypto = require('crypto');

const rooms = new Map();

const generateRoomId = () => {
  while (true) {
    const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
    if (!rooms.has(roomId)) {
      return roomId;
    }
  }
};

const sanitizeName = (value) => {
  const normalized = String(value || 'Listener').trim().slice(0, 40);
  return normalized || 'Listener';
};

const serializeRoom = (room) => ({
  roomId: room.roomId,
  hostSocketId: room.hostSocketId,
  currentSong: room.currentSong,
  isPlaying: room.isPlaying,
  currentTime: room.currentTime,
  members: Array.from(room.members.entries()).map(([socketId, name]) => ({
    socketId,
    name,
  })),
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
});

const getPlaybackTime = (room) => {
  if (!room) {
    return 0;
  }

  if (!room.isPlaying) {
    return room.currentTime;
  }

  const elapsedSeconds = (Date.now() - room.updatedAt) / 1000;
  return Math.max(0, room.currentTime + elapsedSeconds);
};

const serializePlaybackSnapshot = (room) => ({
  roomId: room.roomId,
  hostSocketId: room.hostSocketId,
  currentSong: room.currentSong,
  isPlaying: room.isPlaying,
  currentTime: getPlaybackTime(room),
  members: Array.from(room.members.entries()).map(([socketId, name]) => ({
    socketId,
    name,
  })),
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
  serverTime: Date.now(),
});

const createRoom = (hostName = 'Host') => {
  const roomId = generateRoomId();
  const now = Date.now();

  const room = {
    roomId,
    hostSocketId: null,
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    members: new Map(),
    createdAt: now,
    updatedAt: now,
    hostName: sanitizeName(hostName),
  };

  rooms.set(roomId, room);
  return serializeRoom(room);
};

const getRoom = (roomId) => {
  const room = rooms.get(String(roomId || '').trim());
  if (!room) {
    return null;
  }
  return serializeRoom(room);
};

const getRoomSnapshot = (roomId) => {
  const room = rooms.get(String(roomId || '').trim());
  if (!room) {
    return null;
  }

  return serializePlaybackSnapshot(room);
};

const getAllRoomIds = () => Array.from(rooms.keys());

const updateRoomState = (roomId, statePatch = {}) => {
  const normalizedRoomId = String(roomId || '').trim();
  const room = rooms.get(normalizedRoomId);

  if (!room) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(statePatch, 'currentSong')) {
    room.currentSong = statePatch.currentSong;
  }

  if (Object.prototype.hasOwnProperty.call(statePatch, 'isPlaying')) {
    room.isPlaying = Boolean(statePatch.isPlaying);
  }

  if (Object.prototype.hasOwnProperty.call(statePatch, 'currentTime')) {
    const nextTime = Number(statePatch.currentTime);
    room.currentTime = Number.isFinite(nextTime) && nextTime >= 0 ? nextTime : room.currentTime;
  }

  room.updatedAt = Date.now();
  return serializeRoom(room);
};

const joinSocketToRoom = (roomId, socketId, userName) => {
  const normalizedRoomId = String(roomId || '').trim();
  const room = rooms.get(normalizedRoomId);

  if (!room) {
    return null;
  }

  room.members.set(socketId, sanitizeName(userName));

  if (!room.hostSocketId) {
    room.hostSocketId = socketId;
  }

  room.updatedAt = Date.now();
  return serializeRoom(room);
};

const leaveSocketFromRoom = (roomId, socketId) => {
  const normalizedRoomId = String(roomId || '').trim();
  const room = rooms.get(normalizedRoomId);

  if (!room || !room.members.has(socketId)) {
    return null;
  }

  room.members.delete(socketId);

  if (room.members.size === 0) {
    rooms.delete(normalizedRoomId);
    return { deleted: true, roomId: normalizedRoomId };
  }

  if (room.hostSocketId === socketId) {
    room.hostSocketId = room.members.keys().next().value;
  }

  room.updatedAt = Date.now();
  return serializeRoom(room);
};

const getJoinedRoomsBySocket = (socketId) => {
  const result = [];

  for (const [roomId, room] of rooms.entries()) {
    if (room.members.has(socketId)) {
      result.push(roomId);
    }
  }

  return result;
};

module.exports = {
  createRoom,
  getRoom,
  getRoomSnapshot,
  getAllRoomIds,
  updateRoomState,
  joinSocketToRoom,
  leaveSocketFromRoom,
  getJoinedRoomsBySocket,
};
