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

// Single-flight token refresh to prevent concurrent race conditions
let refreshPromise: Promise<string> | null = null;

function isPublicAuthRequest(url?: string) {
  if (!url) return false;
  return ["/auth/login", "/auth/register", "/auth/google", "/auth/refresh-token"]
    .some((endpoint) => url.includes(endpoint));
}

async function performTokenRefresh(): Promise<string> {
  const currentRefreshToken = localStorage.getItem("refreshToken");
  if (!currentRefreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
    refreshToken: currentRefreshToken,
  });

  const { accessToken, refreshToken: newRefreshToken } = response.data.data;
  if (localStorage.getItem("refreshToken") !== currentRefreshToken) throw new Error("Session changed during refresh");
  if (!accessToken || !newRefreshToken) throw new Error("Incomplete session response");
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", newRefreshToken);
  return accessToken;
}

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

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isPublicAuthRequest(originalRequest.url)) {
      originalRequest._retry = true;
      const refreshTokenAtStart = localStorage.getItem("refreshToken");

      try {
        if (!refreshPromise) {
          refreshPromise = performTokenRefresh().finally(() => {
            refreshPromise = null;
          });
        }

        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
        if (status !== 401 && status !== 403) return Promise.reject(refreshError);
        if (localStorage.getItem("refreshToken") !== refreshTokenAtStart) return Promise.reject(refreshError);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
