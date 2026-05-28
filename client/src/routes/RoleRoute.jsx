import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleHome } from "../utils/constants.js";

export default function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const role = String(user.role || "").toUpperCase();
  return roles.includes(role) ? <Outlet /> : <Navigate to={roleHome[role] || "/login"} replace />;
}
