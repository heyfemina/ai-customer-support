import { Navigate } from "react-router-dom";
import Loader from "../components/common/Loader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { roleHome } from "../utils/constants.js";

export default function RoleHomeRedirect() {
  const { authReady, user } = useAuth();
  if (!authReady) return <Loader />;

  const role = String(user?.role || "").toUpperCase();
  return <Navigate to={roleHome[role] || "/login"} replace />;
}
