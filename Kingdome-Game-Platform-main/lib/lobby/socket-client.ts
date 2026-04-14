import { io, Socket } from "socket.io-client";

// ─── PERMANENT SOCKET — poori app mein ek hi socket ───────────────────────
let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
      transports: ["polling", "websocket"],
      autoConnect: false,
    });
  }
  return _socket;
}

export function connectSocket(): Socket {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

// Legacy exports — purane code ke liye
export function createSocket(): Socket {
  return getSocket();
}

export function setActiveSocket(_s: Socket) {
  // no-op — ab singleton use ho raha hai
}

export function getActiveSocket(): Socket {
  return getSocket();
}