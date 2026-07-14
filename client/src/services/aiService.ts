import apiClient from "./apiClient";
import { ApiResponse } from "./authService";
import { Expense } from "./expenseService";

export interface AiUploadResponse {
  tempId: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  date: string;
  flagged: boolean;
  fileUrl: string;
  message: string;
  ocrRawData?: string;
}

export interface AiConfirmRequest {
  amount: number;
  currency: string;
  merchant: string;
  date: string;
  category: string;
  description?: string;
  fileUrl: string;
  ocrRawData?: string;
}

export interface AiUsage {
  scansThisMonth: number;
  remaining: number;
}
export interface AiCopilotResponse { answer: string; suggestedActions: string[]; dataSources: string[]; generatedAt: string; }
export interface AiCopilotMessage { role: "user" | "assistant"; content: string; }

export const aiService = {
  askCopilot: async (message: string, history: AiCopilotMessage[]): Promise<ApiResponse<AiCopilotResponse>> => {
    try {
      const response = await apiClient.post("/ai/copilot", { message, history });
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || "Veri is unavailable right now" };
    }
  },
  uploadReceipt: async (file: File): Promise<ApiResponse<AiUploadResponse>> => {
    try {
      const formData = new FormData();
      formData.append("File", file);

      const response = await apiClient.post("/ai/upload", formData);
      return response.data;
    } catch (error: any) {
      const serverError =
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message;

      return {
        success: false,
        error: serverError || "Failed to upload receipt",
      };
    }
  },

  confirmReceipt: async (request: AiConfirmRequest): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.post("/ai/confirm", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to confirm receipt",
      };
    }
  },

  getUsage: async (): Promise<ApiResponse<AiUsage>> => {
    try {
      const response = await apiClient.get("/ai/usage");
      return {
        success: response.data.success,
        data: response.data.data
          ? {
              scansThisMonth: response.data.data.scansThisMonth,
              remaining: response.data.data.scansRemaining,
            }
          : undefined,
        error: response.data.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to fetch usage",
      };
    }
  },
};
