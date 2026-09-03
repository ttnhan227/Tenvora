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
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export const authService = {
  login: async (request: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/login", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || [error.response?.data?.message || "Login failed"],
      };
    }
  },

  register: async (request: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/register", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || [error.response?.data?.message || "Registration failed"],
      };
    }
  },

  getProfile: async (): Promise<ApiResponse<UserProfile>> => {
    try {
      const response = await apiClient.get("/auth/me");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch profile"],
      };
    }
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },
};
