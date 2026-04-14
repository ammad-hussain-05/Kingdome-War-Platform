import { Socket } from "socket.io-client";
import { getSocket } from "./socket-client";

// Legacy exports — sab getSocket() use karo
export function setActiveSocket(_s: Socket) {
  // no-op
}

export function getActiveSocket(): Socket {
  return getSocket();
}