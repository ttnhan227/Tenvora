import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import type { InvoiceStats } from "@/services/invoiceService";
import { money } from "@/lib/money";

interface InvoiceStatsCardsProps {
  stats: InvoiceStats | null;
  preferredCurrency?: string;
}

export function InvoiceStatsCards({ stats, preferredCurrency = "USD" }: InvoiceStatsCardsProps) {
  const currency = stats?.currency ?? preferredCurrency;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Total Invoiced ({currency})
        </p>
        <p className="text-2xl sm:text-3xl font-black text-foreground mt-1 font-mono">
          {money(stats?.totalInvoicedAmount ?? 0, currency)}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 font-medium">
          <span>{stats?.totalInvoicesCount ?? 0} invoices in this currency</span>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Collected &amp; Paid
        </p>
        <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
          {money(stats?.totalPaidAmount ?? 0, currency)}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>{stats?.paidInvoicesCount ?? 0} paid with tax reserve allocation</span>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Awaiting Payment
        </p>
        <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
          {money(stats?.totalOutstandingAmount ?? 0, currency)}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 font-medium">
          <span>{stats?.openInvoicesCount ?? 0} awaiting client payment</span>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overdue</p>
        <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
          {stats?.overdueInvoicesCount ?? 0}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-rose-500 mt-2 font-medium">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Requires client follow-up</span>
        </div>
      </div>
    </div>
  );
}
