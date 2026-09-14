import apiClient from "./apiClient";

export interface CashFlowPoint { month: string; income: number; expenses: number }
export interface OverviewInvoice { id: string; invoiceNumber: string; clientName: string; dueDate: string; outstandingAmount: number; currency: string; status: string }
export interface OverviewTransaction { id: string; description: string; type: string; status: string; amount: number; currency: string; date: string; category?: string }
export interface FinancialOverview {
  currency: string; currentBalance: number; incomeThisMonth: number; expensesThisMonth: number;
  netCashFlowThisMonth: number; outstandingInvoices: number; outstandingInvoiceCount: number;
  overdueInvoiceCount: number; cashFlow: CashFlowPoint[]; outstandingItems: OverviewInvoice[];
  recentTransactions: OverviewTransaction[];
}

export const overviewService = {
  async get(): Promise<FinancialOverview> {
    const response = await apiClient.get("/overview");
    return response.data.data;
  },
};
