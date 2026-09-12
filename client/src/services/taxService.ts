import apiClient from './apiClient';

export interface QuarterlyScheduleItem {
  quarter: string;
  periodRange: string;
  dueDate: string;
  estimatedAmount: number;
  status: 'Paid' | 'Upcoming' | 'Overdue';
}

export interface TaxTransferRecord {
  transactionId: string;
  referenceNumber: string;
  amount: number;
  currency: string;
  description: string;
  timestamp: string;
}

export interface TaxSummary {
  currency: string;
  availableSpendingBalance: number;
  taxVaultBalance: number;
  defaultTaxRatePercent: number;
  autoTaxSetAsideEnabled: boolean;
  filingStatus: string;
  personalTaxIdLast4?: string;
  ytdGrossIncome: number;
  ytdTaxSetAsideTotal: number;
  estimatedAnnualTaxLiability: number;
  estimatedCurrentQuarterLiability: number;
  currentQuarter: string;
  nextQuarterDeadline: string;
  daysUntilQuarterDeadline: number;
  quarterlySchedule: QuarterlyScheduleItem[];
  recentTaxSetAsides: TaxTransferRecord[];
}

export interface UpdateTaxSettingsRequest {
  defaultTaxRatePercent?: number;
  autoTaxSetAsideEnabled?: boolean;
  filingStatus?: string;
  personalTaxIdLast4?: string;
  linkedExternalBankName?: string;
}

export interface ManualTaxTransferRequest {
  amount: number;
  direction: 'ToTaxVault' | 'ToSpendingWallet';
  notes?: string;
}

export const taxService = {
  async getTaxSummary(): Promise<TaxSummary> {
    const res = await apiClient.get('/taxes/summary');
    return res.data.data;
  },

  async updateTaxSettings(data: UpdateTaxSettingsRequest): Promise<boolean> {
    const res = await apiClient.put('/taxes/settings', data);
    return res.data.data;
  },

  async transferTax(data: ManualTaxTransferRequest): Promise<TaxTransferRecord> {
    const res = await apiClient.post('/taxes/transfer', data);
    return res.data.data;
  },
};
