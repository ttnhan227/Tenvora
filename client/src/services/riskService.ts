import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface RiskEvaluationItem {
  id: string;
  paymentRequestId: string;
  score: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  decision: "Approved" | "FlaggedForReview" | "Rejected";
  ruleHits: string[];
  createdAt: string;
}

export const riskService = {
  getEvaluations: async (limit: number = 100): Promise<ApiResponse<RiskEvaluationItem[]>> => {
    try {
      const response = await apiClient.get(`/risk/evaluations?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch risk evaluations"],
      };
    }
  },

  submitDecision: async (id: string, decision: "Approved" | "Rejected" | "Dismissed", notes?: string): Promise<ApiResponse<RiskEvaluationItem>> => {
    try {
      const response = await apiClient.post(`/risk/evaluations/${id}/decision`, { decision, notes });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to update risk evaluation decision"],
      };
    }
  },
};
