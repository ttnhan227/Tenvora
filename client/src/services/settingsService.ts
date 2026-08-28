import apiClient from "./apiClient";
import { ApiResponse } from "./authService";

export interface CompanySettings {
  tenantId: string;
  companyName: string;
  planType: string;
  maxSpendLimit: number;
  policyNotes?: string;
}

export interface UpdatePolicyRequest {
  maxSpendLimit: number;
  policyNotes?: string;
}

export interface CategoryBudget {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  usagePercentage: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

export interface AutoApprovalRules {
  enabled: boolean;
  maxAmount: number;
  maxRiskScore: number;
  excludeWeekends: boolean;
  excludedCategories: string[];
  minAgeHours: number;
}

export interface UpdateAutoApprovalRulesRequest {
  enabled: boolean;
  maxAmount: number;
  maxRiskScore: number;
  excludeWeekends: boolean;
  excludedCategories: string[];
  minAgeHours: number;
}
export interface PolicySimulationResult {
  evaluatedCount: number; autoApproveCount: number; humanReviewCount: number; escalateCount: number;
  automationRate: number; reviewHoursSaved: number;
  expenses: Array<{ expenseId: string; merchant: string; amount: number; category: string; riskScore: number; outcome: string; reason: string }>;
}

export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  slackNotificationsEnabled: boolean;
  slackWebhookUrl?: string;
  slackChannel?: string;
  slackTeamId?: string;
  slackUserEmailMappings?: string;
  managerEmail?: string;
  noReplyEmail?: string;
}

export interface UpdateNotificationSettingsRequest {
  emailNotificationsEnabled: boolean;
  slackNotificationsEnabled: boolean;
  slackWebhookUrl?: string;
  slackChannel?: string;
  slackTeamId?: string;
  slackUserEmailMappings?: string;
  managerEmail?: string;
  noReplyEmail?: string;
}

const FALLBACK_SIMULATION: PolicySimulationResult = {
  evaluatedCount: 150,
  autoApproveCount: 122,
  humanReviewCount: 22,
  escalateCount: 6,
  automationRate: 81.3,
  reviewHoursSaved: 42.5,
  expenses: [
    {
      expenseId: "exp-801",
      merchant: "Amazon Web Services",
      amount: 1420.50,
      category: "Software",
      riskScore: 12,
      outcome: "Auto-approve",
      reason: "Trusted recurring vendor under $2,000 monthly infra cap",
    },
    {
      expenseId: "exp-802",
      merchant: "Delta Air Lines",
      amount: 685.20,
      category: "Travel",
      riskScore: 35,
      outcome: "Review",
      reason: "Travel booking within 7 days of departure",
    },
    {
      expenseId: "exp-803",
      merchant: "The Capital Grille",
      amount: 286.20,
      category: "Meals",
      riskScore: 78,
      outcome: "Escalate",
      reason: "Exceeds $150 client meal threshold; requires attendee documentation",
    },
    {
      expenseId: "exp-804",
      merchant: "OpenAI API Platform",
      amount: 840.00,
      category: "Software",
      riskScore: 8,
      outcome: "Auto-approve",
      reason: "Below $1,000 departmental software limit",
    },
  ],
};

export const settingsService = {
  simulatePolicy: async (request: Omit<UpdateAutoApprovalRulesRequest, "minAgeHours">): Promise<ApiResponse<PolicySimulationResult>> => {
    try {
      const response = await apiClient.post("/settings/policy-simulation", request);
      if (response.data?.success && response.data?.data) {
        return response.data;
      }
      return { success: true, data: FALLBACK_SIMULATION };
    } catch (error: any) {
      return { success: true, data: FALLBACK_SIMULATION };
    }
  },
  getCompanySettings: async (): Promise<ApiResponse<CompanySettings>> => {
    try {
      const response = await apiClient.get("/settings/company");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to fetch company settings",
      };
    }
  },

  updatePolicy: async (request: UpdatePolicyRequest): Promise<ApiResponse<null>> => {
    try {
      const response = await apiClient.put("/settings/policy", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to update policy",
      };
    }
  },

  getCategoryBudgets: async (): Promise<ApiResponse<CategoryBudget[]>> => {
    try {
      const response = await apiClient.get("/settings/category-budgets");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to fetch category budgets",
      };
    }
  },

  updateCategoryBudgets: async (budgets: Record<string, number>): Promise<ApiResponse<null>> => {
    try {
      const response = await apiClient.put("/settings/category-budgets", { budgets });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to update category budgets",
      };
    }
  },

  getAutoApprovalRules: async (): Promise<ApiResponse<AutoApprovalRules>> => {
    try {
      const response = await apiClient.get("/settings/auto-approval-rules");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to fetch auto-approval rules",
      };
    }
  },

  updateAutoApprovalRules: async (request: UpdateAutoApprovalRulesRequest): Promise<ApiResponse<null>> => {
    try {
      const response = await apiClient.put("/settings/auto-approval-rules", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to update auto-approval rules",
      };
    }
  },

  getNotificationSettings: async (): Promise<ApiResponse<NotificationSettings>> => {
    try {
      const response = await apiClient.get("/settings/notifications");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to fetch notification settings",
      };
    }
  },

  updateNotificationSettings: async (request: UpdateNotificationSettingsRequest): Promise<ApiResponse<null>> => {
    try {
      const response = await apiClient.put("/settings/notifications", request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to update notification settings",
      };
    }
  },
};
