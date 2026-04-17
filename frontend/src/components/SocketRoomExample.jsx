import React, { useEffect, useState } from 'react';
import useSocketRoom from '../hooks/useSocketRoom';

function SocketRoomExample() {
  const [roomId, setRoomId] = useState('chill-zone');
  const [input, setInput] = useState('');
  const [events, setEvents] = useState([]);
  const { socket, isConnected, socketId, joinRoom, emitEvent } = useSocketRoom();

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleJoinedRoom = ({ roomId: joinedId }) => {
      setEvents((current) => [`Joined room: ${joinedId}`, ...current].slice(0, 20));
    };

    const handleRoomError = ({ message }) => {
      setEvents((current) => [`Room error: ${message}`, ...current].slice(0, 20));
    };

    const handleRoomSync = ({ roomId: syncedRoom, isPlaying, currentTime }) => {
      setEvents((current) => [
        `room_sync -> room=${syncedRoom} playing=${Boolean(isPlaying)} time=${Number(currentTime || 0).toFixed(2)}s`,
        ...current,
      ].slice(0, 20));
    };

    socket.on('joined_room', handleJoinedRoom);
    socket.on('room_error', handleRoomError);
    socket.on('room_sync', handleRoomSync);

    return () => {
      socket.off('joined_room', handleJoinedRoom);
      socket.off('room_error', handleRoomError);
      socket.off('room_sync', handleRoomSync);
    };
  }, [socket]);

  const handleJoinRoom = () => {
    const normalizedRoomId = roomId.trim();
    if (!normalizedRoomId) {
      return;
    }

    joinRoom(normalizedRoomId, 'React User');
    emitEvent('request_room_state', { roomId: normalizedRoomId });
  };

  const handleSendSeek = () => {
    const normalizedRoomId = roomId.trim();
    if (!normalizedRoomId) {
      return;
    }

    emitEvent('seek', {
      roomId: normalizedRoomId,
      currentTime: Number(input || 0),
    });
  };

  return (
    <section>
      <h3>Socket.IO Room Example</h3>
      <p>Status: {isConnected ? 'Connected' : 'Connecting'} {socketId ? `(${socketId})` : ''}</p>

      <div>
        <input
          type="text"
          value={roomId}
          placeholder="roomId"
          onChange={(event) => setRoomId(event.target.value)}
        />
        <button type="button" onClick={handleJoinRoom}>
          Join Room
        </button>
      </div>

      <div>
        <input
          type="number"
          value={input}
          placeholder="seek seconds"
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="button" onClick={handleSendSeek}>
          Emit seek
        </button>
      </div>

      <ul>
        {events.map((eventLog, index) => (
          <li key={`${eventLog}-${index}`}>{eventLog}</li>
        ))}
      </ul>
    </section>
  );
}

export default SocketRoomExample;
