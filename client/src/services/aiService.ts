import apiClient from "./apiClient";
import { ApiResponse } from "./authService";
import { toApiFailure } from "@/lib/apiErrors";

export interface AiChatRequest {
  message: string;
  uiContext?: AiUiContext;
}

export interface AiChatResponse {
  reply: string;
  provider: string;
  model: string;
  isFallback: boolean;
}

export interface AiItemExtraction {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface AiSaleExtraction {
  customerName?: string | null;
  totalAmount: number;
  paidAmount: number;
  description?: string | null;
  paymentMethod?: string;
  items?: AiItemExtraction[] | null;
}

export interface AiExpenseExtraction {
  category: string;
  amount: number;
  description?: string | null;
}

export interface AiPaymentExtraction {
  customerName: string;
  amount: number;
  notes?: string | null;
}

export interface AiParseRecordResponse {
  intent: "sale" | "expense" | "debt_payment" | "unknown";
  confidence: number;
  summary: string;
  sale?: AiSaleExtraction | null;
  expense?: AiExpenseExtraction | null;
  debtPayment?: AiPaymentExtraction | null;
  provider: string;
  model: string;
  isFallback: boolean;
}

export interface AiUiContext {
  route?: string;
  entity?: "customer" | "product" | "sale" | "supplier" | "purchase";
  entityId?: string;
  filters?: Record<string, string>;
}

export interface AiActionCandidate {
  id: string;
  label: string;
  detail?: string | null;
}

export interface AiActionProposalResponse {
  actionId?: string | null;
  intent:
    | "sale" | "expense" | "debt_payment" | "purchase" | "supplier_payment"
    | "create_customer" | "update_customer" | "archive_customer"
    | "create_product" | "update_product" | "archive_product"
    | "create_supplier" | "update_supplier" | "archive_supplier"
    | "void_sale" | "void_purchase" | "update_settings" | "unknown";
  status: "PendingConfirmation" | "NeedsClarification" | "Executed" | "Cancelled" | "Expired" | "Failed" | string;
  riskLevel: "Financial" | "Low" | "Moderate" | "Destructive" | "Administrative" | "None";
  requiresConfirmation: boolean;
  summary: string;
  details: Record<string, string | null>;
  candidates?: AiActionCandidate[] | null;
  expiresAt?: string | null;
}

export interface AiActionExecutionResponse {
  actionId: string;
  status: "Executed" | "Cancelled";
  message: string;
  recordType?: string | null;
  recordId?: string | null;
  previousBalance?: number | null;
  newBalance?: number | null;
}

export interface AiActionInputOverrides {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  unit?: string | null;
  unitPrice?: number | null;
  category?: string | null;
  amount?: number | null;
  description?: string | null;
}

export function applyActionExecutionToProposal(
  proposal: AiActionProposalResponse,
  execution: AiActionExecutionResponse,
  input?: AiActionInputOverrides,
): AiActionProposalResponse {
  const inputDetails = input
    ? Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ""),
      )
    : {};

  return {
    ...proposal,
    status: execution.status,
    requiresConfirmation: false,
    summary: execution.message,
    details: {
      ...proposal.details,
      ...inputDetails,
      Result: execution.message,
    },
  };
}

export interface AiStatusResponse {
  online: boolean;
  provider: string;
  model: string;
  hasApiKey: boolean;
  features: string[];
}

export interface AiAgentToolCallInfo {
  toolName: string;
  summary: string;
  result?: any;
}

export interface AiAgentChatRequest {
  message: string;
  conversationId?: string;
  uiContext?: AiUiContext;
}

export interface AiAgentChatResponse {
  conversationId: string;
  messageId: string;
  reply: string;
  proposal?: AiActionProposalResponse | null;
  toolCalls?: AiAgentToolCallInfo[] | null;
  provider: string;
  model: string;
  isFallback: boolean;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string | null;
}

export interface AiConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  proposal?: AiActionProposalResponse | null;
  toolCalls?: AiAgentToolCallInfo[] | null;
}

export interface AiConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiConversationMessage[];
}

export const aiAssistantService = {
  agentChat: async (request: AiAgentChatRequest): Promise<ApiResponse<AiAgentChatResponse>> => {
    try {
      const response = await apiClient.post<ApiResponse<AiAgentChatResponse>>("/ai/assistant/agent-chat", request);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể kết nối tới Tenvora Agent lúc này.");
    }
  },

  getConversations: async (): Promise<ApiResponse<AiConversationSummary[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<AiConversationSummary[]>>("/ai/assistant/conversations");
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể tải danh sách cuộc trò chuyện.");
    }
  },

  getConversation: async (id: string): Promise<ApiResponse<AiConversationDetail>> => {
    try {
      const response = await apiClient.get<ApiResponse<AiConversationDetail>>(`/ai/assistant/conversations/${id}`);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể tải chi tiết cuộc trò chuyện.");
    }
  },

  deleteConversation: async (id: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await apiClient.delete<ApiResponse<boolean>>(`/ai/assistant/conversations/${id}`);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể xóa cuộc trò chuyện.");
    }
  },

  chat: async (message: string, uiContext?: AiUiContext): Promise<ApiResponse<AiChatResponse>> => {
    try {
      const response = await apiClient.post<ApiResponse<AiChatResponse>>("/ai/assistant/chat", { message, uiContext });
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể kết nối tới trợ lý AI lúc này.");
    }
  },

  parseRecord: async (text: string): Promise<ApiResponse<AiParseRecordResponse>> => {
    try {
      const response = await apiClient.post<ApiResponse<AiParseRecordResponse>>("/ai/assistant/parse-record", { text });
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể phân tích nội dung ghi sổ.");
    }
  },

  proposeAction: async (text: string, uiContext?: AiUiContext): Promise<ApiResponse<AiActionProposalResponse>> => {
    try {
      const response = await apiClient.post<ApiResponse<AiActionProposalResponse>>("/ai/assistant/actions/propose", { text, uiContext });
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể chuẩn bị thao tác này.");
    }
  },

  confirmAction: async (
    actionId: string,
    confirmed: boolean,
    input?: AiActionInputOverrides,
  ): Promise<ApiResponse<AiActionExecutionResponse>> => {
    try {
      const response = await apiClient.post<ApiResponse<AiActionExecutionResponse>>(
        `/ai/assistant/actions/${actionId}/confirm`,
        { confirmed, input },
      );
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể hoàn tất thao tác.");
    }
  },

  getStatus: async (): Promise<ApiResponse<AiStatusResponse>> => {
    try {
      const response = await apiClient.get<ApiResponse<AiStatusResponse>>("/ai/assistant/status");
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Không thể lấy trạng thái AI.");
    }
  },
};
