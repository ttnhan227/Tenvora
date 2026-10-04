import apiClient from "./apiClient";
import { ApiResponse } from "./authService";
import { toApiFailure } from "@/lib/apiErrors";

export interface AuditLogItem {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
  ipAddress?: string;
}

export const auditService = {
  getLogs: async (entityType?: string, entityId?: string, limit: number = 100): Promise<ApiResponse<AuditLogItem[]>> => {
    try {
      const params = new URLSearchParams();
      if (entityType) params.append("entityType", entityType);
      if (entityId) params.append("entityId", entityId);
      params.append("limit", limit.toString());

      const response = await apiClient.get(`/audit?${params.toString()}`);
      return response.data;
    } catch (error: unknown) {
      return toApiFailure(error, "Failed to fetch audit records");
    }
  },
};
