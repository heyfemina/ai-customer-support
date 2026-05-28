import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../components/common/Loader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { authReady, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!authReady) return <Loader />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
