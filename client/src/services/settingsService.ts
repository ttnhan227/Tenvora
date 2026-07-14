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

export const settingsService = {
  simulatePolicy: async (request: Omit<UpdateAutoApprovalRulesRequest, "minAgeHours">): Promise<ApiResponse<PolicySimulationResult>> => {
    try {
      const response = await apiClient.post("/settings/policy-simulation", request);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || "Policy simulation failed" };
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
