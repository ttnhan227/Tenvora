import apiClient from "./apiClient";

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BusinessCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status: "Active" | "Archived";
  currency: string;
  totalSales: number;
  totalPaid: number;
  outstandingBalance: number;
  salesCount: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  unit: string;
  defaultPrice: number;
  costPrice: number;
  stockQuantity: number;
  minStockLevel?: number;
  trackInventory: boolean;
  currency: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface ProductDeletionResult {
  productId: string;
  productName: string;
  deletedPermanently: boolean;
  archived: boolean;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  unitCost?: number | null;
}

export interface BusinessPayment {
  id: string;
  saleId: string;
  saleNumber: string;
  customerId: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  notes?: string;
  paidAt: string;
  isReversed?: boolean;
  reversedAt?: string;
  reversalReason?: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  paymentStatus: "Paid" | "Partially paid" | "Unpaid";
  status: "Posted" | "Voided";
  notes?: string;
  soldAt: string;
  createdAt: string;
  items: SaleItem[];
  payments: BusinessPayment[];
}

export interface CustomerDetail {
  customer: BusinessCustomer;
  sales: Sale[];
  payments: BusinessPayment[];
}

export interface CustomerStatementEntry {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface CustomerStatement {
  customer: BusinessCustomer;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  fromDate?: string;
  toDate?: string;
  entries: CustomerStatementEntry[];
}

export interface CustomerAccountPaymentInput {
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export interface CustomerAccountPaymentResult {
  totalAmountPaid: number;
  totalAllocated: number;
  remainingBalance: number;
  affectedSales: Sale[];
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  quantityBefore: number;
  adjustmentQuantity: number;
  quantityAfter: number;
  reason: string;
  notes?: string;
  adjustedAt: string;
  adjustedByUserId?: string;
}

export interface CreateStockAdjustmentInput {
  productId: string;
  adjustmentQuantity: number;
  reason: string;
  notes?: string;
}

export interface Supplier {
  id: string; name: string; phone?: string; email?: string; address?: string; notes?: string;
  status: "Active" | "Archived"; currency: string; totalPurchases: number; totalPaid: number;
  outstandingBalance: number; purchaseCount: number; createdAt: string;
}

export interface PurchaseItem { id: string; productId?: string; description: string; unit: string; quantity: number; unitCost: number; lineTotal: number; }
export interface PurchasePayment {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  notes?: string;
  paidAt: string;
  isReversed?: boolean;
  reversedAt?: string;
  reversalReason?: string;
}
export interface Purchase { id: string; purchaseNumber: string; supplierId: string; supplierName: string; currency: string; totalAmount: number; paidAmount: number; outstandingBalance: number; paymentStatus: "Paid" | "Partially paid" | "Unpaid"; status: "Posted" | "Voided"; notes?: string; purchasedAt: string; createdAt: string; items: PurchaseItem[]; payments: PurchasePayment[]; }
export interface BusinessExpense { id: string; category: string; amount: number; currency: string; description?: string; expenseDate: string; createdAt: string; }
export interface BusinessActivity { type: string; id: string; title: string; detail: string; amount: number; occurredAt: string; }
export interface BusinessDashboard {
  currency: string;
  period: string;
  periodSales: number;
  periodCogs: number;
  periodPayments: number;
  periodPurchases: number;
  periodSupplierPayments: number;
  periodExpenses: number;
  periodNetProfit: number;
  todaySales: number;
  todayPayments: number;
  todayPurchases: number;
  todaySupplierPayments: number;
  todayExpenses: number;
  outstandingCustomers: number;
  outstandingSuppliers: number;
  unpaidCustomers: BusinessCustomer[];
  unpaidSuppliers: Supplier[];
  recentActivity: BusinessActivity[];
}

export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status?: "Active" | "Archived";
}

export interface ProductInput {
  name: string;
  sku?: string;
  unit: string;
  defaultPrice: number;
  costPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  trackInventory?: boolean;
  notes?: string;
  isActive?: boolean;
}

export interface SaleInput {
  customerId: string;
  items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
  paymentAmount: number;
  paymentMethod: string;
  notes?: string;
  soldAt?: string;
}

const mutationHeaders = () => ({ "Idempotency-Key": crypto.randomUUID() });

export const businessService = {
  async getCustomers(search = "", status = "Active"): Promise<BusinessCustomer[]> {
    const response = await apiClient.get("/customers", { params: { search: search || undefined, status } });
    return response.data.data;
  },

  async getCustomersPaged(search = "", status = "Active", page = 1, pageSize = 20): Promise<PagedResult<BusinessCustomer>> {
    const response = await apiClient.get("/customers", { params: { search: search || undefined, status, page, pageSize } });
    return response.data.data;
  },

  async getCustomer(id: string): Promise<CustomerDetail> {
    const response = await apiClient.get(`/customers/${id}/history`);
    return response.data.data;
  },

  async getCustomerStatement(id: string, from?: string, to?: string): Promise<CustomerStatement> {
    const response = await apiClient.get(`/customers/${id}/statement`, { params: { from, to } });
    return response.data.data;
  },

  async createCustomer(input: CustomerInput): Promise<BusinessCustomer> {
    const response = await apiClient.post("/customers", input);
    return response.data.data;
  },

  async updateCustomer(id: string, input: CustomerInput): Promise<BusinessCustomer> {
    const response = await apiClient.put(`/customers/${id}`, { ...input, status: input.status ?? "Active" });
    return response.data.data;
  },

  async recordCustomerAccountPayment(customerId: string, input: CustomerAccountPaymentInput): Promise<CustomerAccountPaymentResult> {
    const response = await apiClient.post(`/customers/${customerId}/payments`, input, { headers: mutationHeaders() });
    return response.data.data;
  },

  async getProducts(search = "", active?: boolean): Promise<Product[]> {
    const response = await apiClient.get("/products", { params: { search: search || undefined, active } });
    return response.data.data;
  },

  async getProductsPaged(search = "", active?: boolean, page = 1, pageSize = 20): Promise<PagedResult<Product>> {
    const response = await apiClient.get("/products", { params: { search: search || undefined, active, page, pageSize } });
    return response.data.data;
  },

  async getProduct(id: string): Promise<Product> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data.data;
  },

  async createProduct(input: ProductInput): Promise<Product> {
    const response = await apiClient.post("/products", input);
    return response.data.data;
  },

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    const response = await apiClient.put(`/products/${id}`, { ...input, isActive: input.isActive ?? true });
    return response.data.data;
  },

  async deleteProduct(id: string): Promise<ProductDeletionResult> {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data.data;
  },

  async getStockAdjustments(productId?: string): Promise<StockAdjustment[]> {
    const response = await apiClient.get("/products/adjustments", { params: { productId } });
    return response.data.data;
  },

  async createStockAdjustment(input: CreateStockAdjustmentInput): Promise<StockAdjustment> {
    const response = await apiClient.post("/products/adjustments", input);
    return response.data.data;
  },

  async getSales(search = "", customerId?: string, from?: string, to?: string): Promise<Sale[]> {
    const response = await apiClient.get("/sales", { params: { search: search || undefined, customerId, from, to } });
    return response.data.data;
  },

  async getSalesPaged(search = "", customerId?: string, from?: string, to?: string, page = 1, pageSize = 20): Promise<PagedResult<Sale>> {
    const response = await apiClient.get("/sales", { params: { search: search || undefined, customerId, from, to, page, pageSize } });
    return response.data.data;
  },

  async getSale(id: string): Promise<Sale> {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data.data;
  },

  async createSale(input: SaleInput): Promise<Sale> {
    const response = await apiClient.post("/sales", input, { headers: mutationHeaders() });
    return response.data.data;
  },

  async recordPayment(saleId: string, input: { amount: number; method: string; reference?: string; notes?: string }): Promise<Sale> {
    const response = await apiClient.post(`/sales/${saleId}/payments`, input, { headers: mutationHeaders() });
    return response.data.data;
  },

  async reverseSalePayment(saleId: string, paymentId: string, reason?: string): Promise<Sale> {
    const response = await apiClient.post(`/sales/${saleId}/payments/${paymentId}/reverse`, { reason }, { headers: mutationHeaders() });
    return response.data.data;
  },

  async voidSale(saleId: string, options?: { reversePayments?: boolean; reason?: string }): Promise<Sale> {
    const response = await apiClient.post(`/sales/${saleId}/void`, options ?? {}, { headers: mutationHeaders() });
    return response.data.data;
  },

  async getSuppliers(search = "", status = "Active"): Promise<Supplier[]> {
    const response = await apiClient.get("/suppliers", { params: { search: search || undefined, status } });
    return response.data.data;
  },

  async getSuppliersPaged(search = "", status = "Active", page = 1, pageSize = 20): Promise<PagedResult<Supplier>> {
    const response = await apiClient.get("/suppliers", { params: { search: search || undefined, status, page, pageSize } });
    return response.data.data;
  },

  async getSupplier(id: string): Promise<{ supplier: Supplier; purchases: Purchase[]; payments: PurchasePayment[] }> {
    const response = await apiClient.get(`/suppliers/${id}/history`);
    return response.data.data;
  },

  async createSupplier(input: { name: string; phone?: string; email?: string; address?: string; notes?: string }): Promise<Supplier> {
    const response = await apiClient.post("/suppliers", input);
    return response.data.data;
  },

  async updateSupplier(id: string, input: { name: string; phone?: string; email?: string; address?: string; notes?: string; status?: string }): Promise<Supplier> {
    const response = await apiClient.put(`/suppliers/${id}`, { ...input, status: input.status ?? "Active" });
    return response.data.data;
  },

  async getPurchases(search = "", supplierId?: string, from?: string, to?: string): Promise<Purchase[]> {
    const response = await apiClient.get("/purchases", { params: { search: search || undefined, supplierId, from, to } });
    return response.data.data;
  },

  async getPurchasesPaged(search = "", supplierId?: string, from?: string, to?: string, page = 1, pageSize = 20): Promise<PagedResult<Purchase>> {
    const response = await apiClient.get("/purchases", { params: { search: search || undefined, supplierId, from, to, page, pageSize } });
    return response.data.data;
  },

  async createPurchase(input: { supplierId: string; items: Array<{ description: string; unit: string; quantity: number; unitCost: number; productId?: string }>; paymentAmount: number; paymentMethod: string; notes?: string; purchasedAt?: string }): Promise<Purchase> {
    const response = await apiClient.post("/purchases", input, { headers: mutationHeaders() });
    return response.data.data;
  },

  async recordPurchasePayment(id: string, input: { amount: number; method: string; reference?: string; notes?: string }): Promise<Purchase> {
    const response = await apiClient.post(`/purchases/${id}/payments`, input, { headers: mutationHeaders() });
    return response.data.data;
  },

  async reversePurchasePayment(purchaseId: string, paymentId: string, reason?: string): Promise<Purchase> {
    const response = await apiClient.post(`/purchases/${purchaseId}/payments/${paymentId}/reverse`, { reason }, { headers: mutationHeaders() });
    return response.data.data;
  },

  async voidPurchase(purchaseId: string, options?: { reversePayments?: boolean; reason?: string }): Promise<Purchase> {
    const response = await apiClient.post(`/purchases/${purchaseId}/void`, options ?? {}, { headers: mutationHeaders() });
    return response.data.data;
  },

  async getBusinessExpenses(search = "", category = "", from?: string, to?: string): Promise<BusinessExpense[]> {
    const response = await apiClient.get("/business-expenses", { params: { search: search || undefined, category: category || undefined, from, to } });
    return response.data.data;
  },

  async getBusinessExpensesPaged(search = "", category = "", from?: string, to?: string, page = 1, pageSize = 20): Promise<PagedResult<BusinessExpense>> {
    const response = await apiClient.get("/business-expenses", { params: { search: search || undefined, category: category || undefined, from, to, page, pageSize } });
    return response.data.data;
  },

  async createBusinessExpense(input: { category: string; amount: number; expenseDate?: string; description?: string }): Promise<BusinessExpense> {
    const response = await apiClient.post("/business-expenses", input, { headers: mutationHeaders() });
    return response.data.data;
  },

  async updateBusinessExpense(id: string, input: { category: string; amount: number; expenseDate?: string; description?: string }): Promise<BusinessExpense> {
    const response = await apiClient.put(`/business-expenses/${id}`, input);
    return response.data.data;
  },

  async deleteBusinessExpense(id: string): Promise<void> {
    await apiClient.delete(`/business-expenses/${id}`);
  },

  async getDashboard(period?: string, from?: string, to?: string): Promise<BusinessDashboard> {
    const config = period || from || to ? { params: { period, from, to } } : undefined;
    const response = await (config ? apiClient.get("/business-dashboard", config) : apiClient.get("/business-dashboard"));
    return response.data.data;
  },
};

export const USD_TO_VND_RATE = 25000;

const CURRENCY_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  VND: USD_TO_VND_RATE,
  EUR: 0.92,
  GBP: 0.79,
  SGD: 1.34,
};

export const convertCurrency = (
  amount: number = 0,
  fromCurrency: string = "USD",
  toCurrency: string = "VND"
): number => {
  if (!amount) return 0;
  const from = (fromCurrency || "USD").toUpperCase();
  const to = (toCurrency || "VND").toUpperCase();
  if (from === to) return amount;

  if (from === "VND" && to === "USD") {
    return Math.round((amount / USD_TO_VND_RATE) * 10000) / 10000;
  }
  if (from === "USD" && to === "VND") {
    return Math.round(amount * USD_TO_VND_RATE);
  }

  const fromRate = CURRENCY_RATES_TO_USD[from] || 1.0;
  const toRate = CURRENCY_RATES_TO_USD[to] || 1.0;
  const inUsd = amount / fromRate;
  const result = inUsd * toRate;

  if (to === "VND") {
    return Math.round(result);
  }
  return Math.round(result * 10000) / 10000;
};

export const businessMoney = (amount: number = 0, currency: string = "VND") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(amount || 0);

export function apiError(error: unknown, fallback: string) {
  const candidate = error as { response?: { data?: { message?: string; errors?: string[] } }; message?: string };
  return candidate.response?.data?.errors?.[0] || candidate.response?.data?.message || candidate.message || fallback;
}
