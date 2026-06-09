import axios from "axios";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../utils/constants.js";

const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:5000/api" : `${browserOrigin}/api`;
const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || fallbackApiUrl;
const missingProductionApiUrl = import.meta.env.PROD && !import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: apiUrl,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 25000),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if ((config.method || "get").toLowerCase() === "get") {
    config.headers["Cache-Control"] = "no-store";
    config.headers.Pragma = "no-cache";
    config.params = { ...(config.params || {}), _t: Date.now() };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      window.dispatchEvent(new Event("auth:logout"));
    }
    const isTimeout = error.code === "ECONNABORTED";
    const isNetworkError = error.message === "Network Error" || !error.response;
    error.friendlyMessage = isNetworkError
      ? missingProductionApiUrl
        ? "Vercel is missing VITE_API_URL. Add your backend API URL in Vercel environment variables and redeploy."
        : isTimeout
          ? `The backend did not respond in time. Check that ${apiUrl} is awake and reachable.`
          : `Unable to reach the backend API. Check that ${apiUrl} is running and allowed by CORS.`
      : error.response?.data?.message || error.message || "Something went wrong";
    return Promise.reject(error);
  }
);

export default api;

function readLocalFileUrl(file) {
  return new Promise((resolve) => {
    if (!file || file.size > 5 * 1024 * 1024) {
      resolve("#");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("#");
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(file, extra = {}) {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  try {
    const { data } = await api.post("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data || data;
  } catch {
    const fileUrl = await readLocalFileUrl(file);
    return {
      fileName: file.name,
      fileUrl,
      fileType: file.type,
      fileSize: file.size,
      ...extra,
    };
  }
}
