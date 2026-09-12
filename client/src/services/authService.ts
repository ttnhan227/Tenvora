import apiClient from "./apiClient";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  email: string;
  password: string;
  baseCurrency?: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  isActive: boolean;
  preferredCurrency: string;
  companyName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  companyName: string;
  preferredCurrency: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
}

function apiFailure(error: unknown, fallback: string): ApiResponse<never> {
  const payload = (error as { response?: { data?: unknown } })?.response?.data;
  const body = payload && typeof payload === "object"
    ? payload as { message?: unknown; title?: unknown; errors?: unknown }
    : undefined;

  const fieldErrors: Record<string, string[]> = {};
  let errors: string[] = [];

  if (Array.isArray(body?.errors)) {
    errors = body.errors.map(String).filter(Boolean);
  } else if (body?.errors && typeof body.errors === "object") {
    for (const [field, messages] of Object.entries(body.errors as Record<string, unknown>)) {
      const normalized = Array.isArray(messages)
        ? messages.map(String).filter(Boolean)
        : [String(messages)].filter(Boolean);

      if (normalized.length > 0) {
        fieldErrors[field] = normalized;
        errors.push(...normalized);
      }
    }
  }

  const responseMessage = typeof body?.message === "string" && body.message.trim()
    ? body.message.trim()
    : undefined;
  const validationTitle = typeof body?.title === "string" && body.title.trim()
    ? body.title.trim()
    : undefined;
  const message = responseMessage || errors[0] || validationTitle || fallback;

  return {
    success: false,
    message,
    errors: errors.length > 0 ? errors : [message],
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}

export const authService = {
  login: async (request: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/login", request);
      return response.data;
    } catch (error: unknown) {
      return apiFailure(error, "Login failed");
    }
  },

  register: async (request: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/register", request);
      return response.data;
    } catch (error: unknown) {
      return apiFailure(error, "Registration failed");
    }
  },

  getProfile: async (): Promise<ApiResponse<UserProfile>> => {
    try {
      const response = await apiClient.get("/auth/me");
      return response.data;
    } catch (error: unknown) {
      return apiFailure(error, "Failed to fetch profile");
    }
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },
};
