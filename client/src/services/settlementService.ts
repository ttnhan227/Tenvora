import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface SettlementEntry {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  feeAmount: number;
  netAmount: number;
  createdAt: string;
}

export interface SettlementBatch {
  id: string;
  batchReference: string;
  status: string;
  cutoffTime: string;
  currency: string;
  totalTransactions: number;
  grossAmount: number;
  totalFees: number;
  netSettlementAmount: number;
  createdAt: string;
  settledAt?: string;
  entries: SettlementEntry[];
}

export const settlementService = {
  createBatch: async (currency: string = "USD"): Promise<ApiResponse<SettlementBatch>> => {
    try {
      const response = await apiClient.post(`/settlement/batches/create?currency=${currency}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to create settlement batch"],
      };
    }
  },

  getBatches: async (): Promise<ApiResponse<SettlementBatch[]>> => {
    try {
      const response = await apiClient.get("/settlement/batches");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch settlement batches"],
      };
    }
  },

  getBatchById: async (id: string): Promise<ApiResponse<SettlementBatch>> => {
    try {
      const response = await apiClient.get(`/settlement/batches/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch settlement batch"],
      };
    }
  },
};
