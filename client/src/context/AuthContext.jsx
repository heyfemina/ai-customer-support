import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import { roleHome } from "../utils/constants.js";

const AuthContext = createContext(null);
const demoKeys = ["demo:tickets", "demo:users", "demo:chats", "demo:activity-logs"];

function readStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

function persistSession(authToken, authUser) {
  localStorage.setItem("token", authToken);
  localStorage.setItem("user", JSON.stringify(authUser));
}

function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(readStoredUser);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    demoKeys.forEach((key) => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!token) {
        clearStoredSession();
        if (active) {
          setUser(null);
          setAuthReady(true);
        }
        return;
      }

      try {
        const { data } = await api.get("/auth/profile");
        const profile = data.data || data.user || data;
        if (!profile?.id || !profile?.role) throw new Error("Invalid profile response");
        persistSession(token, profile);
        if (active) setUser(profile);
      } catch {
        clearStoredSession();
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setAuthReady(true);
      }
    }

    setAuthReady(false);
    restoreSession();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const handleLogout = () => {
      setToken(null);
      setUser(null);
      setAuthReady(true);
    };

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    const authToken = data.token || data.data?.token;
    const authUser = data.user || data.data?.user;
    if (data.data?.requires2FA) return data.data;
    if (!authToken || !authUser) throw new Error("Invalid login response");
    persistSession(authToken, authUser);
    setToken(authToken);
    setUser(authUser);
    setAuthReady(true);
    return authUser;
  };

  const complete2FA = ({ authToken, authUser }) => {
    if (!authToken || !authUser) throw new Error("Invalid 2FA response");
    persistSession(authToken, authUser);
    setToken(authToken);
    setUser(authUser);
    setAuthReady(true);
    return authUser;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data.data || data;
  };

  const logout = () => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setAuthReady(true);
  };

  const value = useMemo(
    () => ({ token, user, authReady, isAuthenticated: Boolean(token && user), login, register, logout, complete2FA, roleHome }),
    [token, user, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
