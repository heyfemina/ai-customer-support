import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios.js";
import { demoUsers, roleHome } from "../utils/constants.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async ({ email, password }) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const authToken = data.token || data.data?.token;
      const authUser = data.user || data.data?.user;
      if (!authToken || !authUser) throw new Error("Invalid login response");
      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
      return authUser;
    } catch (error) {
      const demo = demoUsers.find((item) => item.email === email && item.password === password);
      if (!demo) throw error;
      const authUser = { id: demo.role.toLowerCase(), name: demo.name, email: demo.email, role: demo.role };
      const authToken = `demo-${demo.role.toLowerCase()}-token`;
      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
      return authUser;
    }
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token && user), login, register, logout, roleHome }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
