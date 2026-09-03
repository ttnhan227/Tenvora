import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface Transaction {
  id: string;
  tenantId: string;
  paymentRequestId?: string;
  referenceNumber: string;
  transactionType: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  originalTransactionId?: string;
  settlementBatchId?: string;
  createdAt: string;
  postedAt?: string;
  ledgerEntriesCount: number;
}

export interface CreateTransferRequest {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface CreatePaymentResponse {
  paymentRequestId: string;
  transactionId?: string;
  referenceNumber: string;
  status: string;
  amount: number;
  currency: string;
  rejectionReason?: string;
  processedAt: string;
}

export const paymentService = {
  executeTransfer: async (idempotencyKey: string, request: CreateTransferRequest): Promise<ApiResponse<CreatePaymentResponse>> => {
    try {
      const response = await apiClient.post("/payments/transfers", request, {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || [error.response?.data?.message || "Transfer failed"],
      };
    }
  },

  reverseTransaction: async (transactionId: string, reason?: string): Promise<ApiResponse<CreatePaymentResponse>> => {
    try {
      const response = await apiClient.post(`/payments/transactions/${transactionId}/reverse`, { reason });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || [error.response?.data?.message || "Reversal failed"],
      };
    }
  },

  getTransactions: async (status?: string, limit: number = 100): Promise<ApiResponse<Transaction[]>> => {
    try {
      const url = status ? `/payments/transactions?status=${status}&limit=${limit}` : `/payments/transactions?limit=${limit}`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch transactions"],
      };
    }
  },

  getTransactionById: async (id: string): Promise<ApiResponse<Transaction>> => {
    try {
      const response = await apiClient.get(`/payments/transactions/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch transaction"],
      };
    }
  },
};
