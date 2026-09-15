import axios, { AxiosInstance, AxiosError } from "axios";
import { reportRequestActivity } from "@/lib/requestActivity";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "/api"
).replace(/\/+$/, "");

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach token
apiClient.interceptors.request.use(
  (config) => {
    reportRequestActivity(1);
    (config as any)._activityTracked = true;
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let the browser set multipart boundary for FormData uploads.
    if (typeof FormData !== "undefined" && config.data instanceof FormData && config.headers) {
      delete (config.headers as any)["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Mutex to serialize token refresh operations
let refreshMutex = Promise.resolve();

// Response interceptor to handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => {
    if ((response.config as any)._activityTracked) {
      (response.config as any)._activityTracked = false;
      reportRequestActivity(-1);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    if (originalRequest?._activityTracked) {
      originalRequest._activityTracked = false;
      reportRequestActivity(-1);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes("/auth/")) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          // No refresh token available, redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Use mutex to ensure only one refresh request at a time
        const refreshResult = await (refreshMutex = refreshMutex.then(async () => {
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", newRefreshToken);
            return accessToken;
          } catch (refreshError) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            window.location.href = "/login";
            throw refreshError;
          }
        }));

        originalRequest.headers.Authorization = `Bearer ${refreshResult}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
