import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface LedgerEntry {
  id: string;
  transactionId?: string | null;
  accountId: string;
  accountNumber?: string;
  entryType: string;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  description?: string;
  postedAt: string;
}

export interface AccountLedgerHistory {
  accountId: string;
  accountNumber: string;
  currency: string;
  cachedBalance: number;
  derivedBalance: number;
  isBalanced: boolean;
  entries: LedgerEntry[];
}

export const ledgerService = {
  getEntriesByTransactionId: async (transactionId: string): Promise<ApiResponse<LedgerEntry[]>> => {
    try {
      const response = await apiClient.get(`/ledger/transactions/${transactionId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch ledger entries"],
      };
    }
  },

  getAccountLedgerHistory: async (accountId: string): Promise<ApiResponse<AccountLedgerHistory>> => {
    try {
      const response = await apiClient.get(`/ledger/accounts/${accountId}/history`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        errors: error.response?.data?.errors || ["Failed to fetch account ledger history"],
      };
    }
  },
};
