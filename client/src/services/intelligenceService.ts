import apiClient from "./apiClient";

export interface ExternalArticle {
  id: string;
  source: string;
  sourceCategory: "Regulatory" | "Research" | "Payments" | "Infrastructure" | string;
  title: string;
  summary: string;
  canonicalUrl: string;
  publishedAt: string;
  retrievedAt: string;
  author?: string;
  imageUrl?: string;
  language: string;
  contentHash: string;
  operationalImpactTag?: string;
  tenvoraAnalysis?: string;
}

export interface MarketExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  effectiveDate: string;
  source: string;
  status: string;
}

export interface ContentSource {
  id: string;
  name: string;
  providerType: string;
  endpointUrl: string;
  category: string;
  authorityTier: string;
  isEnabled: boolean;
  lastSuccessfulFetch?: string;
  lastStatus?: string;
  articlesCount: number;
}

export interface IntelligenceFeedResponse {
  totalCount: number;
  lastUpdated: string;
  nextScheduledSync: string;
  activeSources: string[];
  availableCategories: string[];
  articles: ExternalArticle[];
  registeredSources: ContentSource[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  message?: string;
}

export const intelligenceService = {
  async getFeed(category?: string, search?: string, limit = 30): Promise<ApiResponse<IntelligenceFeedResponse>> {
    try {
      const params = new URLSearchParams();
      if (category && category !== "ALL") params.append("category", category);
      if (search) params.append("search", search);
      if (limit) params.append("limit", limit.toString());

      const res = await apiClient.get<ApiResponse<IntelligenceFeedResponse>>(`/intelligence/feed?${params.toString()}`);
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        errors: [err.response?.data?.message || err.message || "Failed to load financial intelligence."],
      };
    }
  },

  async getArticleById(id: string): Promise<ApiResponse<ExternalArticle>> {
    try {
      const res = await apiClient.get<ApiResponse<ExternalArticle>>(`/intelligence/articles/${id}`);
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        errors: [err.response?.data?.message || err.message || "Failed to load article."],
      };
    }
  },

  async getMarketRates(): Promise<ApiResponse<MarketExchangeRate[]>> {
    try {
      const res = await apiClient.get<ApiResponse<MarketExchangeRate[]>>("/intelligence/market-rates");
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        errors: [err.response?.data?.message || err.message || "Failed to load market rates."],
      };
    }
  },

  async getSources(): Promise<ApiResponse<ContentSource[]>> {
    try {
      const res = await apiClient.get<ApiResponse<ContentSource[]>>("/intelligence/sources");
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        errors: [err.response?.data?.message || err.message || "Failed to load content sources."],
      };
    }
  },

  async toggleSource(id: string, isEnabled: boolean): Promise<ApiResponse<boolean>> {
    try {
      const res = await apiClient.post<ApiResponse<boolean>>(`/intelligence/sources/${id}/toggle`, { isEnabled });
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        errors: [err.response?.data?.message || err.message || "Failed to toggle source."],
      };
    }
  },

  async triggerSync(): Promise<ApiResponse<string>> {
    try {
      const res = await apiClient.post<ApiResponse<string>>("/intelligence/sync");
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        errors: [err.response?.data?.message || err.message || "Failed to trigger synchronization."],
      };
    }
  },
};
