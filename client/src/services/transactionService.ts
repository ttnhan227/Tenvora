import apiClient from "./apiClient";
import type { Transaction } from "./paymentService";

export interface TransactionPage { items: Transaction[]; page: number; pageSize: number; totalCount: number; totalPages: number }
export interface TransactionQuery { search?: string; type?: string; status?: string; from?: string; to?: string; sort?: string; page?: number; pageSize?: number }
export const transactionService = {
  async list(params: TransactionQuery): Promise<TransactionPage> {
    const response = await apiClient.get("/transactions", { params });
    return response.data.data;
  },
};
