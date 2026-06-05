import { Navigate } from "react-router-dom";
import Loader from "../components/common/Loader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboardPath } from "../utils/constants.js";

export default function RoleHomeRedirect() {
  const { authReady, user } = useAuth();
  if (!authReady) return <Loader />;

  return <Navigate to={getDashboardPath(user?.role)} replace />;
}
