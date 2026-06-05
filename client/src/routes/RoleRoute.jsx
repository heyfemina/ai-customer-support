import { Navigate, Outlet } from "react-router-dom";
import Loader from "../components/common/Loader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboardPath, normalizeRole } from "../utils/constants.js";

export default function RoleRoute({ roles }) {
  const { authReady, user } = useAuth();
  if (!authReady) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  const role = normalizeRole(user.role);
  return roles.includes(role) ? <Outlet /> : <Navigate to={getDashboardPath(role)} replace />;
}
