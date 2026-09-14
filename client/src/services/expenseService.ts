import apiClient from "./apiClient";

export const expenseCategories = ["Software", "Equipment", "Workspace", "Transportation", "Marketing", "Professional Services", "Education", "Other"] as const;
export interface Expense {
  id: string; accountId: string; transactionId: string; clientId?: string; clientName?: string;
  projectId?: string; projectName?: string; merchant: string; category: string; description?: string;
  reference?: string; amount: number; currency: string; expenseDate: string; status: "Posted" | "Void";
  createdAt: string; voidedAt?: string;
}
export interface CreateExpenseRequest {
  accountId: string; clientId?: string; projectId?: string; merchant: string; category: string;
  description?: string; reference?: string; amount: number; currency: string; expenseDate: string;
}
export interface ExpenseSummary { currency: string; total: number; count: number; byCategory: Array<{ category: string; amount: number; count: number }> }

export const expenseService = {
  async list(params: { search?: string; category?: string; status?: string; from?: string; to?: string } = {}): Promise<Expense[]> {
    const response = await apiClient.get("/expenses", { params });
    return response.data.data;
  },
  async summary(): Promise<ExpenseSummary> {
    const response = await apiClient.get("/expenses/summary");
    return response.data.data;
  },
  async create(request: CreateExpenseRequest, idempotencyKey: string): Promise<Expense> {
    const response = await apiClient.post("/expenses", request, { headers: { "Idempotency-Key": idempotencyKey } });
    return response.data.data;
  },
  async void(id: string, reason?: string): Promise<Expense> {
    const response = await apiClient.post(`/expenses/${id}/void`, { reason });
    return response.data.data;
  },
};
