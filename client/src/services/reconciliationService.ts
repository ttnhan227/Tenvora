import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface ReconciliationDiscrepancy {
  id: string;
  accountId: string;
  accountNumber?: string;
  expectedBalance: number;
  calculatedBalance: number;
  discrepancyAmount: number;
  reason: string;
  resolved: boolean;
  createdAt: string;
}

export interface ReconciliationRun {
  id: string;
  tenantId: string;
  runNumber: string;
  status: string;
  totalAccountsChecked: number;
  totalLedgerEntriesChecked: number;
  discrepancyCount: number;
  notes?: string;
  startedAt: string;
  completedAt?: string;
  discrepancies: ReconciliationDiscrepancy[];
}

export const reconciliationService = {
  runReconciliation: async (notes?: string): Promise<ApiResponse<ReconciliationRun>> => {
    try {
      const response = await apiClient.post("/reconciliation/run", { notes });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to trigger reconciliation"],
      };
    }
  },

  getRuns: async (): Promise<ApiResponse<ReconciliationRun[]>> => {
    try {
      const response = await apiClient.get("/reconciliation/runs");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch reconciliation runs"],
      };
    }
  },

  getRunById: async (id: string): Promise<ApiResponse<ReconciliationRun>> => {
    try {
      const response = await apiClient.get(`/reconciliation/runs/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch reconciliation run"],
      };
    }
  },
};
