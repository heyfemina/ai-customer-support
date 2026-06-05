import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, getDashboardPath, normalizeRole, roleHome } from "../utils/constants.js";

const AuthContext = createContext(null);
const demoKeys = ["demo:tickets", "demo:users", "demo:chats", "demo:activity-logs"];
const legacyAuthKeys = ["token", "user", "role", AUTH_TOKEN_KEY, AUTH_USER_KEY];

const authStorage = () => window.sessionStorage;

function clearLegacyLocalAuth() {
  legacyAuthKeys.forEach((key) => localStorage.removeItem(key));
}

function readStoredUser() {
  try {
    const stored = authStorage().getItem(AUTH_USER_KEY);
    return stored ? normalizeAuthUser(JSON.parse(stored)) : null;
  } catch {
    authStorage().removeItem(AUTH_USER_KEY);
    return null;
  }
}

function normalizeAuthUser(authUser) {
  if (!authUser) return null;
  return { ...authUser, role: normalizeRole(authUser.role) };
}

function persistSession(authToken, authUser) {
  const normalizedUser = normalizeAuthUser(authUser);
  authStorage().setItem(AUTH_TOKEN_KEY, authToken);
  authStorage().setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser));
  return normalizedUser;
}

function assertExpectedRole(authUser, expectedRole) {
  const normalizedExpectedRole = normalizeRole(expectedRole);
  if (!normalizedExpectedRole) return;
  const actualRole = normalizeRole(authUser?.role);
  if (actualRole !== normalizedExpectedRole) {
    const error = new Error("Selected role does not match this account.");
    error.code = "ROLE_MISMATCH";
    error.actualRole = actualRole || "UNKNOWN";
    error.expectedRole = normalizedExpectedRole;
    error.friendlyMessage = `This account is ${error.actualRole}, not ${error.expectedRole}. Please choose the correct role.`;
    throw error;
  }
}

function clearStoredSession() {
  authStorage().removeItem(AUTH_TOKEN_KEY);
  authStorage().removeItem(AUTH_USER_KEY);
}

function readAuthPayload(payload) {
  const data = payload?.data || payload || {};
  return {
    data,
    token: data.token || payload?.token,
    user: data.user || payload?.user,
    requires2FA: Boolean(data.requires2FA || payload?.requires2FA),
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authStorage().getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    clearLegacyLocalAuth();
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
        const normalizedProfile = persistSession(token, profile);
        if (active) {
          setUser(normalizedProfile);
          window.dispatchEvent(new CustomEvent("auth:profile", { detail: normalizedProfile }));
        }
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

  const login = async ({ email, password, expectedRole }) => {
    const response = await api.post("/auth/login", { email, password });
    const { data, token: authToken, user: authUser, requires2FA } = readAuthPayload(response.data);
    if (requires2FA) return data;
    if (!authToken || !authUser) throw new Error("Invalid login response");
    assertExpectedRole(authUser, expectedRole);
    const normalizedUser = persistSession(authToken, authUser);
    setToken(authToken);
    setUser(normalizedUser);
    setAuthReady(true);
    return normalizedUser;
  };

  const complete2FA = ({ authToken, authUser, expectedRole }) => {
    if (!authToken || !authUser) throw new Error("Invalid 2FA response");
    assertExpectedRole(authUser, expectedRole);
    const normalizedUser = persistSession(authToken, authUser);
    setToken(authToken);
    setUser(normalizedUser);
    setAuthReady(true);
    return normalizedUser;
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
    () => ({ token, user, authReady, isAuthenticated: Boolean(token && user), login, register, logout, complete2FA, roleHome, getDashboardPath }),
    [token, user, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
