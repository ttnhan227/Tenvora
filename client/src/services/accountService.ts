import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface Account {
  id: string;
  tenantId: string;
  customerId?: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  cachedBalance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  externalReference?: string;
  email?: string;
  status: string;
  createdAt: string;
  accounts: Account[];
}

export interface CreateAccountRequest {
  accountNumber: string;
  accountType: string;
  currency: string;
  customerId?: string;
  initialDeposit?: number;
}

export interface CreateCustomerRequest {
  name: string;
  externalReference?: string;
  email?: string;
}

export const accountService = {
  getAccounts: async (customerId?: string): Promise<ApiResponse<Account[]>> => {
    try {
      const url = customerId ? `/accounts?customerId=${customerId}` : "/accounts";
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch accounts"],
      };
    }
  },

  getAccountById: async (id: string): Promise<ApiResponse<Account>> => {
    try {
      const response = await apiClient.get(`/accounts/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch account"],
      };
    }
  },

  createAccount: async (request: CreateAccountRequest): Promise<ApiResponse<Account>> => {
    try {
      const response = await apiClient.post("/accounts", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to create account"],
      };
    }
  },

  getCustomers: async (): Promise<ApiResponse<Customer[]>> => {
    try {
      const response = await apiClient.get("/accounts/customers");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch customers"],
      };
    }
  },

  createCustomer: async (request: CreateCustomerRequest): Promise<ApiResponse<Customer>> => {
    try {
      const response = await apiClient.post("/accounts/customers", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to create customer"],
      };
    }
  },
};
