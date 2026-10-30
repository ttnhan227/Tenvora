import apiClient from "./apiClient";
import { ApiResponse } from "./authService";
import { toApiFailure } from "@/lib/apiErrors";
import { AI_CONSENT_DECLINED, requireAiConsent } from "@/lib/aiConsent";
import { CreatePurchaseItemRequest } from "./aiService";

export interface CaptureLineItem {
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  matchedProductId?: string | null;
  matchedProductName?: string | null;
  confidence: number;
  source: string;
  why?: string | null;
}

export interface CaptureProvenanceField {
  value: unknown;
  confidence: number;
  source: string;
  why: string;
}

export interface CaptureProvenance {
  overallConfidence: number;
  sourceType: string;
  fields: Record<string, CaptureProvenanceField>;
  explanations: Record<string, string>;
}

export interface DuplicateWarning {
  isDuplicate: boolean;
  duplicateReason?: string | null;
  recordType?: string | null;
  recordId?: string | null;
  recordNumber?: string | null;
  recordDate?: string | null;
  recordAmount?: number | null;
}

export interface CaptureDraft {
  intent: "purchase" | "expense";
  vendor?: string | null;
  supplierId?: string | null;
  category?: string | null;
  date?: string | null;
  dueDate?: string | null;
  currency: string;
  totalAmount: number;
  taxAmount: number;
  paidAmount: number;
  paymentMethod: string;
  notes?: string | null;
  invoiceImageUrl?: string | null;
  fileHash?: string | null;
  lineItems: CaptureLineItem[];
  provenance: CaptureProvenance;
  validationErrors: string[];
  validationWarnings: string[];
}

export interface CaptureResult {
  actionId: string;
  intent: string;
  status: string;
  draft: CaptureDraft;
  duplicate: DuplicateWarning;
  summary: string;
}

export interface AnalyzeDocumentRequest {
  dataUrl?: string | null;
  fileUrl?: string | null;
  rawText?: string | null;
  documentTypeHint?: "purchase" | "expense" | "auto" | null;
}

export interface TenantExtractionRule {
  id: string;
  ruleType: string;
  rawPattern: string;
  normalizedPattern: string;
  targetEntityId?: string | null;
  targetName: string;
  createdAt: string;
}

export interface CreateExtractionRuleRequest {
  ruleType: string;
  rawPattern: string;
  targetEntityId?: string | null;
  targetName: string;
}

export interface BulkApproveResult {
  totalProcessed: number;
  approvedCount: number;
  failedCount: number;
  messages: string[];
}

export const captureService = {
  analyzeDocument: async (request: AnalyzeDocumentRequest): Promise<ApiResponse<CaptureResult>> => {
    if (!await requireAiConsent()) return { success: false, errors: [AI_CONSENT_DECLINED] };
    try {
      const response = await apiClient.post<ApiResponse<CaptureResult>>("/capture/analyze", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể phân tích tài liệu lúc này.");
    }
  },

  uploadAndAnalyze: async (file: File, documentTypeHint?: string, rawText?: string): Promise<ApiResponse<CaptureResult>> => {
    if (!await requireAiConsent()) return { success: false, errors: [AI_CONSENT_DECLINED] };
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (documentTypeHint) formData.append("documentTypeHint", documentTypeHint);
      if (rawText) formData.append("rawText", rawText);

      const response = await apiClient.post<ApiResponse<CaptureResult>>("/capture/upload-and-analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể tải lên và quét hóa đơn.");
    }
  },

  getReviewQueue: async (): Promise<ApiResponse<CaptureResult[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<CaptureResult[]>>("/capture/queue");
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể tải danh sách tài liệu chờ duyệt.");
    }
  },

  bulkApprove: async (actionIds: string[]): Promise<ApiResponse<BulkApproveResult>> => {
    try {
      const response = await apiClient.post<ApiResponse<BulkApproveResult>>("/capture/bulk-approve", { actionIds });
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể duyệt hàng loạt bản thảo.");
    }
  },

  rejectDraft: async (actionId: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.post<ApiResponse<boolean>>(`/capture/queue/${actionId}/reject`);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể từ chối bản thảo.");
    }
  },

  getRules: async (): Promise<ApiResponse<TenantExtractionRule[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<TenantExtractionRule[]>>("/capture/rules");
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể tải danh sách quy tắc ghi nhớ.");
    }
  },

  createRule: async (request: CreateExtractionRuleRequest): Promise<ApiResponse<TenantExtractionRule>> => {
    try {
      const response = await apiClient.post<ApiResponse<TenantExtractionRule>>("/capture/rules", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể lưu quy tắc ghi nhớ.");
    }
  },

  deleteRule: async (ruleId: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.delete<ApiResponse<boolean>>(`/capture/rules/${ruleId}`);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể xóa quy tắc ghi nhớ.");
    }
  }
};
