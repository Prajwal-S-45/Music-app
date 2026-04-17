import { useCallback, useEffect, useState } from 'react';
import { createSocketClient, releaseSocketClient } from '../realtime/socketClient';

function useSocketRoom() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState('');

  useEffect(() => {
    const socketClient = createSocketClient();
    setSocket(socketClient);

    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socketClient.id || '');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketId('');
    };

    socketClient.on('connect', handleConnect);
    socketClient.on('disconnect', handleDisconnect);

    return () => {
      socketClient.off('connect', handleConnect);
      socketClient.off('disconnect', handleDisconnect);
      releaseSocketClient();
    };
  }, []);

  const joinRoom = useCallback((roomId, userName) => {
    if (!socket || !roomId) {
      return;
    }

    socket.emit('join_room', {
      roomId,
      userName: userName || 'Listener',
    });
  }, [socket]);

  const emitEvent = useCallback((eventName, payload = {}) => {
    if (!socket || !eventName) {
      return;
    }

    socket.emit(eventName, payload);
  }, [socket]);

  const subscribe = useCallback((eventName, handler) => {
    if (!socket || !eventName || typeof handler !== 'function') {
      return () => {};
    }

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket]);

  return {
    socket,
    isConnected,
    socketId,
    joinRoom,
    emitEvent,
    subscribe,
  };
}

export default useSocketRoom;
