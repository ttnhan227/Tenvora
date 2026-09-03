import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  preferredCurrency: string;
  createdAt: string;
}

export interface AdminCreateUserRequest {
  email: string;
  password: string;
  role: string;
  preferredCurrency?: string;
}

export const adminUserService = {
  getUsers: async (): Promise<ApiResponse<AdminUser[]>> => {
    try {
      const response = await apiClient.get("/admin/users");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch users"],
      };
    }
  },

  createUser: async (request: AdminCreateUserRequest): Promise<ApiResponse<AdminUser>> => {
    try {
      const response = await apiClient.post("/admin/users", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || [error.response?.data?.message || "Failed to create user"],
      };
    }
  },

  toggleUserActive: async (userId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.patch(`/admin/users/${userId}/toggle-active`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to toggle user status"],
      };
    }
  },
};
