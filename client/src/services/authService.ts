import apiClient, { bumpApiSessionEpoch } from "./apiClient";
import { toApiFailure } from "@/lib/apiErrors";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  credential: string;
}

export interface RegisterRequest {
  companyName: string;
  email: string;
  password: string;
  baseCurrency?: string;
}

export interface SetPasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface CompleteOnboardingRequest {
  companyName: string;
  preferredCurrency: string;
  businessType: string;
  fullName?: string;
  phoneNumber?: string;
}

export interface UpdateSettingsRequest {
  companyName: string;
  preferredCurrency: string;
  businessType: string;
  fullName?: string;
  phoneNumber?: string;
}


export interface UserProfile {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  isActive: boolean;
  preferredCurrency: string;
  companyName: string;
  googleLinked?: boolean;
  hasPassword?: boolean;
  businessType?: string | null;
  onboardingCompleted?: boolean;
  fullName?: string | null;
  phoneNumber?: string | null;
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
  googleLinked?: boolean;
  hasPassword?: boolean;
  businessType?: string | null;
  onboardingCompleted?: boolean;
  fullName?: string | null;
  phoneNumber?: string | null;
}

export interface ApiResponse<T> {
  status?: number;
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
}

let refreshEpoch = 0;

export const authService = {
  refreshSession: async (): Promise<boolean> => {
    const startEpoch = refreshEpoch;
    try {
      const response = await apiClient.post("/auth/refresh-token", {});
      if (refreshEpoch !== startEpoch) return false;
      return Boolean(response.data?.success);
    } catch (error) {
      const failure = toApiFailure(error, "Could not restore your session");
      if (refreshEpoch !== startEpoch) return false;
      if (failure.status === 401 || failure.status === 403) return false;
      throw error;
    }
  },

  login: async (request: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/login", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Login failed");
    }
  },

  googleLogin: async (request: GoogleLoginRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/google", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Google sign-in failed");
    }
  },

  register: async (request: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post("/auth/register", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Registration failed");
    }
  },

  setPassword: async (request: SetPasswordRequest): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.post("/auth/set-password", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Failed to update password");
    }
  },

  getProfile: async (): Promise<ApiResponse<UserProfile>> => {
    try {
      const response = await apiClient.get("/auth/me");
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Failed to fetch profile");
    }
  },

  completeOnboarding: async (request: CompleteOnboardingRequest): Promise<ApiResponse<UserProfile>> => {
    try {
      const response = await apiClient.post("/auth/onboarding", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Failed to complete workspace setup");
    }
  },

  updateSettings: async (request: UpdateSettingsRequest): Promise<ApiResponse<UserProfile>> => {
    try {
      const response = await apiClient.put("/auth/settings", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Failed to update settings");
    }
  },


  logout: async () => {
    refreshEpoch++;
    bumpApiSessionEpoch?.();
    try {
      await apiClient.post("/auth/logout", {});
    } catch {
      // Ignore network errors on logout
    }
  },
};
