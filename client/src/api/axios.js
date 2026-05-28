import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:logout"));
    }
    error.friendlyMessage = error.response?.data?.message || error.message || "Something went wrong";
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
