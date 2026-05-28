import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSocket } from "../socket/socket.js";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socket = useMemo(() => (token ? getSocket(token) : null), [token]);

  useEffect(() => {
    if (!socket || token?.startsWith("demo-")) return undefined;
    socket.connect();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat_notification", (notification) => {
      setNotifications((current) => [{ id: Date.now(), ...notification }, ...current].slice(0, 8));
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("chat_notification");
      socket.disconnect();
    };
  }, [socket, token]);

  const pushNotification = useCallback((notification) => {
    setNotifications((current) => [{ id: Date.now(), ...notification }, ...current].slice(0, 8));
  }, []);

  const clearNotifications = () => setNotifications([]);

  return <SocketContext.Provider value={{ socket, connected, notifications, pushNotification, clearNotifications }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
