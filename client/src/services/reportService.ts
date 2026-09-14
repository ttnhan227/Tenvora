import apiClient from "./apiClient";
import type { CashFlowPoint } from "./overviewService";

export interface FinancialReport {
  currency: string; from: string; to: string; income: number; expenses: number; net: number;
  outstandingInvoices: number; incomeByClient: Array<{ name: string; amount: number }>;
  expensesByCategory: Array<{ name: string; amount: number }>; cashFlow: CashFlowPoint[];
}
export const reportService = {
  async get(from?: string, to?: string): Promise<FinancialReport> {
    const response = await apiClient.get("/reports/summary", { params: { from, to } });
    return response.data.data;
  },
};
