import apiClient from "./apiClient";
import { ApiResponse } from "./authService";
import { toApiFailure } from "@/lib/apiErrors";

export interface SearchCustomerItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  totalDebt: number;
}

export interface SearchProductItem {
  id: string;
  name: string;
  sku?: string | null;
  sellingPrice: number;
  stockQuantity: number;
  unit: string;
  trackInventory: boolean;
}

export interface SearchSaleItem {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  totalAmount: number;
  paidAmount: number;
  status: string;
  soldAt: string;
}

export interface SearchPurchaseItem {
  id: string;
  purchaseNumber: string;
  supplierName?: string | null;
  totalAmount: number;
  paidAmount: number;
  status: string;
  purchasedAt: string;
  dueDate?: string | null;
}

export interface OmniSearchResult {
  query: string;
  customers: SearchCustomerItem[];
  products: SearchProductItem[];
  sales: SearchSaleItem[];
  purchases: SearchPurchaseItem[];
}

export const searchService = {
  search: async (query: string, limit = 8): Promise<ApiResponse<OmniSearchResult>> => {
    try {
      const response = await apiClient.get<ApiResponse<OmniSearchResult>>("/search", {
        params: { q: query, limit }
      });
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể tìm kiếm lúc này.");
    }
  }
};
