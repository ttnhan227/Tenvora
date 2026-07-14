import apiClient from "./apiClient";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  companyName: string;
  planType: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  profile: UserProfile;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const authService = {
  createDemo: async (): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/demo");
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || "Demo provisioning failed" };
    }
  },
  login: async (request: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/login", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  },

  acceptInvite: async (token: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/accept-invite", {
        token,
        password,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to accept invite",
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
        error: error.response?.data?.error || "Registration failed",
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
        error: error.response?.data?.error || "Failed to fetch profile",
      };
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<null>> => {
    try {
      const response = await apiClient.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to change password",
      };
    }
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },
};
