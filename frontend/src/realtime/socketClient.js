import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

let sharedSocket = null;
let retainCount = 0;
let disconnectTimer = null;

const socketOptions = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
  timeout: 10000,
};

export function createSocketClient() {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, socketOptions);
  }

  retainCount += 1;

  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }

  if (!sharedSocket.connected) {
    sharedSocket.connect();
  }

  return sharedSocket;
}

export function releaseSocketClient() {
  retainCount = Math.max(0, retainCount - 1);

  if (!sharedSocket || retainCount > 0) {
    return;
  }

  disconnectTimer = setTimeout(() => {
    if (sharedSocket && retainCount === 0) {
      sharedSocket.disconnect();
    }
    disconnectTimer = null;
  }, 600);
}

export { SOCKET_URL };
