import { io } from "socket.io-client";

let socket;

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000";

export function getSocket(token) {
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      reconnectionAttempts: 5,
      timeout: 20000,
      auth: { token },
    });
  }
  socket.auth = { token };
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
}
