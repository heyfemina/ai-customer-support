import { io } from "socket.io-client";

let socket;

export function getSocket(token) {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      autoConnect: false,
      auth: { token },
    });
  }
  socket.auth = { token };
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
}
