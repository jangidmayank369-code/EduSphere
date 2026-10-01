import axios from "axios";

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("edusphere_access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiClient;