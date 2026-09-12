import apiClient from './apiClient';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentTerms?: string;
  notes?: string;
  destinationAccountId: string;
  paymentTransactionId?: string;
  paidAt?: string;
  viewedAt?: string;
  createdAt: string;
  items: InvoiceItem[];
}

export interface InvoiceStats {
  currency: string;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
  totalInvoicesCount: number;
  openInvoicesCount: number;
  paidInvoicesCount: number;
  overdueInvoicesCount: number;
}

export interface CreateInvoiceItemRequest {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceRequest {
  clientId: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  taxRate?: number;
  paymentTerms?: string;
  notes?: string;
  destinationAccountId?: string;
  items: CreateInvoiceItemRequest[];
}

export interface PayInvoiceRequest {
  amount?: number;
  autoTaxSetAside?: boolean;
}

export const invoiceService = {
  async getInvoices(status?: string, clientId?: string): Promise<InvoiceSummary[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (clientId) params.clientId = clientId;
    const res = await apiClient.get('/invoices', { params });
    return res.data.data;
  },

  async getInvoiceById(id: string): Promise<InvoiceSummary> {
    const res = await apiClient.get(`/invoices/${id}`);
    return res.data.data;
  },

  async getInvoiceStats(): Promise<InvoiceStats> {
    const res = await apiClient.get('/invoices/stats');
    return res.data.data;
  },

  async createInvoice(data: CreateInvoiceRequest): Promise<InvoiceSummary> {
    const res = await apiClient.post('/invoices', data);
    return res.data.data;
  },

  async sendInvoice(id: string): Promise<InvoiceSummary> {
    const res = await apiClient.post(`/invoices/${id}/send`);
    return res.data.data;
  },

  async payInvoice(id: string, data?: PayInvoiceRequest): Promise<InvoiceSummary> {
    const res = await apiClient.post(`/invoices/${id}/pay`, data ?? { autoTaxSetAside: true });
    return res.data.data;
  },

  async deleteInvoice(id: string): Promise<boolean> {
    const res = await apiClient.delete(`/invoices/${id}`);
    return res.data.data;
  },
};
