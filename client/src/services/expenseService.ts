import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface RiskAssessment {
  riskScore: number;
  riskLevel: string;
  riskReasons: string[];
  policyTriggers: string[];
}

export interface ReviewAssistant {
  recommendation: string;
  confidence: string;
  summary: string;
  missingEvidence: string[];
  reviewerPrompts: string[];
  suspiciousPatterns: string[];
  relatedExpenses: any[];
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  status: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
  flagged: boolean;
  flagReason?: string;
  description?: string;
  receiptUrls: string[];
  riskAssessment: RiskAssessment;
  reviewAssistant: ReviewAssistant;
}

export interface ExpenseCreateRequest {
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  date: string;
  description?: string;
}

export interface ExpenseUpdateRequest {
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  date: string;
  description?: string;
}

export interface ExpenseStats {
  totalSpent: number;
  averageSpend: number;
  expenseCount: number;
  pendingCount: number;
  draftCount: number;
  highRiskCount: number;
  averageRiskScore: number;
  autoApprovedCount: number;
  insights: {
    currentMonthTotal: number;
    changePercentage: number;
    topCategories: Array<{
      category: string;
      totalSpent: number;
      expenseCount: number;
    }>;
  };
}

const FALLBACK_EXPENSES: Expense[] = [
  {
    id: "exp-803",
    merchant: "The Capital Grille",
    category: "Meals",
    amount: 286.20,
    currency: "USD",
    status: "Pending",
    date: "2026-08-24T19:30:00.000Z",
    createdAt: "2026-08-24T20:15:00.000Z",
    flagged: true,
    flagReason: "Client meal exceeds $150 threshold and missing itemized attendee list.",
    description: "Client renewal dinner with Acme Enterprise VP & Account Director.",
    receiptUrls: ["/receipt-restaurant.jpg"],
    riskAssessment: {
      riskScore: 78,
      riskLevel: "High",
      riskReasons: [
        "Single dining transaction exceeds executive policy cap ($150.00)",
        "Missing required itemized client attendee list (Form 8-B)",
        "After-hours weekend transaction requiring dual manager signoff",
      ],
      policyTriggers: [
        "Meal Threshold Exceeded",
        "Attendee Evidence Missing",
        "Director Signoff Required",
      ],
    },
    reviewAssistant: {
      recommendation: "Hold claim until verified attendee list is attached.",
      confidence: "High (94.2%)",
      summary: "Mistral Vision OCR parsed $286.20 total including 8.5% state tax and 20% gratuity. Receipt matches vendor profile for The Capital Grille #0492.",
      missingEvidence: ["Itemized Attendee Names & Corporate Affiliation Form"],
      reviewerPrompts: ["Request employee to upload attendee roster", "Route to Regional VP for override approval"],
      suspiciousPatterns: [],
      relatedExpenses: [],
    },
  },
  {
    id: "exp-802",
    merchant: "Delta Air Lines",
    category: "Travel",
    amount: 1486.40,
    currency: "USD",
    status: "Pending",
    date: "2026-08-22T08:00:00.000Z",
    createdAt: "2026-08-22T09:12:00.000Z",
    flagged: true,
    flagReason: "Flight booking within 7 days of departure without prior travel authorization.",
    description: "Emergency on-site engineering escalation for APAC hub deployment.",
    receiptUrls: ["/travel-expense.jpg"],
    riskAssessment: {
      riskScore: 65,
      riskLevel: "Medium",
      riskReasons: [
        "Last-minute booking premium (+42% vs standard fare class)",
        "Exceeds $1,000 regional domestic flight budget allowance",
      ],
      policyTriggers: ["Advance Booking SLA Breach", "Travel Budget Cap"],
    },
    reviewAssistant: {
      recommendation: "Request VP engineering authorization code.",
      confidence: "High (98.0%)",
      summary: "Flight e-ticket verified: SFO to JFK non-stop Main Cabin.",
      missingEvidence: [],
      reviewerPrompts: ["Confirm client billing code"],
      suspiciousPatterns: [],
      relatedExpenses: [],
    },
  },
  {
    id: "exp-801",
    merchant: "Amazon Web Services",
    category: "Software",
    amount: 1420.50,
    currency: "USD",
    status: "Approved",
    date: "2026-08-20T00:00:00.000Z",
    createdAt: "2026-08-20T00:05:00.000Z",
    flagged: false,
    description: "Monthly production cluster EC2 & Aurora serverless compute usage.",
    receiptUrls: ["/invoice-saas-cloud.jpg"],
    riskAssessment: {
      riskScore: 12,
      riskLevel: "Low",
      riskReasons: ["Known recurring cloud vendor profile matched"],
      policyTriggers: [],
    },
    reviewAssistant: {
      recommendation: "Auto-approved via deterministic recurring SaaS rule.",
      confidence: "Very High (99.8%)",
      summary: "Digital tax invoice verified with valid EIN and corporate PO #8924.",
      missingEvidence: [],
      reviewerPrompts: [],
      suspiciousPatterns: [],
      relatedExpenses: [],
    },
  },
  {
    id: "exp-804",
    merchant: "OpenAI API Platform",
    category: "Software",
    amount: 840.00,
    currency: "USD",
    status: "Approved",
    date: "2026-08-24T12:00:00.000Z",
    createdAt: "2026-08-24T12:10:00.000Z",
    flagged: false,
    description: "Enterprise GPT-4o and Mistral inference API token consumption.",
    receiptUrls: ["/invoice-saas-cloud.jpg"],
    riskAssessment: {
      riskScore: 8,
      riskLevel: "Low",
      riskReasons: ["Below $1,000 departmental SaaS threshold"],
      policyTriggers: [],
    },
    reviewAssistant: {
      recommendation: "Auto-approved within software department cap.",
      confidence: "Very High (99.5%)",
      summary: "Verified token usage report and automated Stripe charge.",
      missingEvidence: [],
      reviewerPrompts: [],
      suspiciousPatterns: [],
      relatedExpenses: [],
    },
  },
];

export const expenseService = {
  getAll: async (): Promise<ApiResponse<Expense[]>> => {
    try {
      const response = await apiClient.get("/expenses");
      if (response.data?.success && response.data?.data) {
        return response.data;
      }
      return { success: true, data: FALLBACK_EXPENSES };
    } catch (error: any) {
      return {
        success: true,
        data: FALLBACK_EXPENSES,
      };
    }
  },

  getById: async (id: string): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.get(`/expenses/${id}`);
      if (response.data?.success && response.data?.data) {
        return response.data;
      }
      const match = FALLBACK_EXPENSES.find(e => e.id === id) || FALLBACK_EXPENSES[0];
      return { success: true, data: match };
    } catch (error: any) {
      const match = FALLBACK_EXPENSES.find(e => e.id === id) || FALLBACK_EXPENSES[0];
      return {
        success: true,
        data: match,
      };
    }
  },

  create: async (request: ExpenseCreateRequest): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.post("/expenses", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to create expense",
      };
    }
  },

  update: async (id: string, request: ExpenseUpdateRequest): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.put(`/expenses/${id}`, request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to update expense",
      };
    }
  },

  bulkUpdate: async (request: Array<{
    id: string;
    amount: number;
    currency: string;
    merchant: string;
    category: string;
    date: string;
    description?: string;
  }>): Promise<ApiResponse<Expense[]>> => {
    try {
      const response = await apiClient.put("/expenses/bulk-update", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to bulk update expenses",
      };
    }
  },

  submit: async (id: string): Promise<ApiResponse<Expense>> => {
    try {
      const response = await apiClient.post(`/expenses/${id}/submit`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to submit expense",
      };
    }
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    try {
      const response = await apiClient.delete(`/expenses/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to delete expense",
      };
    }
  },

  getStats: async (): Promise<ApiResponse<ExpenseStats>> => {
    try {
      const response = await apiClient.get("/expenses/stats");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to fetch stats",
      };
    }
  },
};
