import axios, { AxiosInstance, AxiosError } from "axios";
import { reportRequestActivity } from "@/lib/requestActivity";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "/api"
).replace(/\/+$/, "");

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function readCookie(name: string): string | null {
  if (typeof document === "undefined" || !document.cookie) return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

// Request interceptor to attach CSRF token and locale
apiClient.interceptors.request.use(
  (config) => {
    reportRequestActivity(1);
    (config as any)._activityTracked = true;

    const method = (config.method || "get").toUpperCase();
    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
      const csrfToken = readCookie("XSRF-TOKEN");
      if (csrfToken && config.headers) {
        config.headers["X-XSRF-TOKEN"] = csrfToken;
      }
    }

    const currentLang = localStorage.getItem("tenvora_lang") || "vi";
    if (config.headers) {
      config.headers["Accept-Language"] = currentLang;
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
let refreshPromise: Promise<void> | null = null;
let sessionEpoch = 0;

export function bumpApiSessionEpoch() {
  sessionEpoch++;
}

function isPublicAuthRequest(url?: string) {
  if (!url) return false;
  return ["/auth/login", "/auth/register", "/auth/google", "/auth/refresh-token", "/auth/logout"]
    .some((endpoint) => url.includes(endpoint));
}

async function performTokenRefresh(): Promise<void> {
  const startEpoch = sessionEpoch;
  const csrfToken = readCookie("XSRF-TOKEN");
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh-token`,
    {},
    {
      withCredentials: true,
      headers: csrfToken ? { "X-XSRF-TOKEN": csrfToken } : undefined,
    }
  );
  if (sessionEpoch !== startEpoch) {
    throw new Error("Session changed during refresh");
  }
  if (!response.data?.success) {
    throw new Error("Incomplete session response");
  }
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
      const epochAtStart = sessionEpoch;

      try {
        if (!refreshPromise) {
          refreshPromise = performTokenRefresh().finally(() => {
            refreshPromise = null;
          });
        }

        await refreshPromise;
        return apiClient(originalRequest);
      } catch (refreshError) {
        const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
        if (status !== 400 && status !== 401 && status !== 403) return Promise.reject(refreshError);
        if (sessionEpoch !== epochAtStart) return Promise.reject(error);
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/" &&
          !String(originalRequest.url || "").includes("/auth/me")
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
