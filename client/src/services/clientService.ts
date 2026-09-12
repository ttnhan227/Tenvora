import apiClient from './apiClient';

export interface ClientSummary {
  id: string;
  name: string;
  contactEmail: string;
  phone?: string;
  company?: string;
  address?: string;
  currency: string;
  defaultPaymentTermsDays: number;
  hourlyRate?: number;
  status: string;
  notes?: string;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  openInvoicesCount: number;
  createdAt: string;
}

export interface CreateClientRequest {
  name: string;
  contactEmail: string;
  phone?: string;
  company?: string;
  address?: string;
  currency?: string;
  defaultPaymentTermsDays?: number;
  hourlyRate?: number;
  notes?: string;
}

export interface UpdateClientRequest {
  name?: string;
  contactEmail?: string;
  phone?: string;
  company?: string;
  address?: string;
  currency?: string;
  defaultPaymentTermsDays?: number;
  hourlyRate?: number;
  status?: string;
  notes?: string;
}

export const clientService = {
  async getClients(status?: string): Promise<ClientSummary[]> {
    const params = status ? { status } : {};
    const res = await apiClient.get('/clients', { params });
    return res.data.data;
  },

  async getClientById(id: string): Promise<ClientSummary> {
    const res = await apiClient.get(`/clients/${id}`);
    return res.data.data;
  },

  async createClient(data: CreateClientRequest): Promise<ClientSummary> {
    const res = await apiClient.post('/clients', data);
    return res.data.data;
  },

  async updateClient(id: string, data: UpdateClientRequest): Promise<ClientSummary> {
    const res = await apiClient.put(`/clients/${id}`, data);
    return res.data.data;
  },

  async deleteClient(id: string): Promise<boolean> {
    const res = await apiClient.delete(`/clients/${id}`);
    return res.data.data;
  },
};
