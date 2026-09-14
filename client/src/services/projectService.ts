import apiClient from "./apiClient";

export interface ProjectSummary {
  id: string; clientId: string; clientName: string; name: string; description?: string;
  status: "Planned" | "Active" | "Completed" | "Archived"; startDate?: string; endDate?: string;
  budgetAmount?: number; currency: string; totalBilled: number; totalReceived: number;
  totalExpenses: number; outstandingAmount: number; invoiceCount: number; createdAt: string; updatedAt: string;
}
export interface CreateProjectRequest {
  clientId: string; name: string; description?: string; status?: string; startDate?: string;
  endDate?: string; budgetAmount?: number; currency?: string;
}

export const projectService = {
  async list(params: { search?: string; status?: string; clientId?: string } = {}): Promise<ProjectSummary[]> {
    const response = await apiClient.get("/projects", { params });
    return response.data.data;
  },
  async create(request: CreateProjectRequest): Promise<ProjectSummary> {
    const response = await apiClient.post("/projects", request);
    return response.data.data;
  },
  async archive(id: string): Promise<ProjectSummary> {
    const response = await apiClient.post(`/projects/${id}/archive`);
    return response.data.data;
  },
};
