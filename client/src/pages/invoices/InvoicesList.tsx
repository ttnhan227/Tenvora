import React, { useCallback, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkspaceAiInsight } from "@/components/assistant/WorkspaceAiInsight";
import {
  invoiceService,
  InvoiceSummary,
  InvoiceStats,
} from "@/services/invoiceService";
import { clientService, ClientSummary } from "@/services/clientService";
import { projectService, type ProjectSummary } from "@/services/projectService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { taxService } from "@/services/taxService";
import { money } from "@/lib/money";
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  DollarSign,
  Search,
} from "lucide-react";

import { InvoiceStatsCards } from "@/components/invoices/InvoiceStatsCards";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { RecordPaymentDialog } from "@/components/invoices/RecordPaymentDialog";
import { InvoiceDetailDialog } from "@/components/invoices/InvoiceDetailDialog";
import { CancelInvoiceDialog } from "@/components/invoices/CancelInvoiceDialog";
import {
  InvoiceCelebrationModal,
  type CelebrationData,
} from "@/components/invoices/InvoiceCelebrationModal";

export const InvoicesList: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [taxRule, setTaxRule] = useState({ enabled: false, rate: 25 });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<InvoiceSummary | null>(null);
  const [viewInvoice, setViewInvoice] = useState<InvoiceSummary | null>(null);
  const [destructiveTarget, setDestructiveTarget] = useState<InvoiceSummary | null>(null);
  const [destructivePending, setDestructivePending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const [invList, invStats, clientList, projectList, taxSummary] = await Promise.all([
        invoiceService.getInvoices(),
        invoiceService.getInvoiceStats(),
        clientService.getClients(),
        projectService.list(),
        taxService.getTaxSummary(),
      ]);
      setInvoices(invList);
      setStats(invStats);
      setClients(clientList);
      setProjects(projectList);
      setTaxRule({
        enabled: taxSummary.autoTaxSetAsideEnabled,
        rate: taxSummary.defaultTaxRatePercent,
      });
    } catch (err) {
      console.error("Failed to load invoices:", err);
      setLoadError("We couldn't load your invoices. Your data has not been changed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading) return;

    if (searchParams.get("create") === "1") {
      setCreateModalOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }

    const paymentInvoiceId = searchParams.get("pay");
    if (paymentInvoiceId) {
      const invoice = invoices.find((item) => item.id === paymentInvoiceId);
      if (invoice && invoice.status !== "Paid") {
        setInvoiceToPay(invoice);
        setPayModalOpen(true);
      }
      setSearchParams({}, { replace: true });
    }
  }, [invoices, loading, searchParams, setSearchParams]);

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await invoiceService.sendInvoice(invoiceId);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send invoice");
    }
  };

  const handleInvoiceDestructiveAction = async () => {
    if (!destructiveTarget) return;
    try {
      setDestructivePending(true);
      if (destructiveTarget.status === "Draft") {
        await invoiceService.deleteInvoice(destructiveTarget.id);
        toast.success("Draft invoice deleted.");
      } else {
        await invoiceService.cancelInvoice(destructiveTarget.id, "Cancelled by the workspace owner");
        toast.success("Invoice cancelled. Its history remains available.");
      }
      setDestructiveTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "We couldn't update this invoice.");
    } finally {
      setDestructivePending(false);
    }
  };

  const clientFilter = searchParams.get("client");
  const activeClient = clients.find((client) => client.id === clientFilter);
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "open"
        ? ["Sent", "Viewed", "PartiallyPaid", "Overdue"].includes(inv.status)
        : inv.status.toLowerCase() === filterStatus.toLowerCase();

    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch && (!clientFilter || inv.clientId === clientFilter);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Paid
          </span>
        );
      case "Sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Send className="w-3 h-3" /> Sent
          </span>
        );
      case "Viewed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Eye className="w-3 h-3" /> Viewed
          </span>
        );
      case "PartiallyPaid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <DollarSign className="w-3 h-3" /> Partially paid
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Invoices &amp; Billing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create invoices, follow what is due, and connect confirmed deposits to the work that generated them.
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">Invoices are temporarily unavailable</p>
              <p className="mt-1 text-muted-foreground">{loadError}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}>
              Try again
            </Button>
          </div>
        )}

        {/* Top Metric Cards */}
        <InvoiceStatsCards stats={stats} preferredCurrency={user?.preferredCurrency} />

        <WorkspaceAiInsight
          title="AI invoice summary"
          prompt="Which client invoices need attention first and why? Use overdue status, payment terms, and outstanding amounts from my workspace."
        />

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "open", "Draft", "Sent", "Paid", "Overdue"].map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={filterStatus === status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap cursor-pointer ${
                  filterStatus === status
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {status === "all" ? "All Invoices" : status === "open" ? "Open & Awaiting" : status}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              aria-label="Search invoices"
              placeholder="Search by client or #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>
        </div>

        {activeClient && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs">
            <p className="text-muted-foreground">Showing invoices for <span className="font-bold text-foreground">{activeClient.name}</span></p>
            <button type="button" onClick={() => setSearchParams({})} className="font-bold text-primary hover:underline">Show all invoices</button>
          </div>
        )}

        {/* Invoices Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue / Due Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Loading invoices...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <div className="max-w-sm mx-auto space-y-3">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <p className="font-semibold text-foreground text-sm">
                          {activeClient
                            ? `No invoices recorded for ${activeClient.name}`
                            : filterStatus === "Paid"
                            ? "No settled invoices yet"
                            : filterStatus === "Overdue"
                            ? "🎉 Clear skies! No overdue invoices."
                            : filterStatus === "open"
                            ? "All caught up! No pending invoices awaiting payment."
                            : searchQuery
                            ? `No invoices matching "${searchQuery}"`
                            : "No invoices yet — send your first one to get paid faster."}
                        </p>
                        <p className="text-xs">
                          {filterStatus === "Paid"
                            ? "When you confirm a client deposit, the payment and estimated tax allocation will appear here."
                            : filterStatus === "Overdue"
                            ? "All your clients are current on their billing terms."
                            : filterStatus === "open"
                            ? "Create an invoice whenever you finish milestone work for a client."
                            : "Create clear invoices in supported billing currencies and track them through payment."}
                        </p>
                        {filterStatus === "all" && !searchQuery && (
                          <p className="text-[11px] font-medium text-primary">Use Create Invoice at the top to start billing.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-foreground">{inv.clientName}</p>
                          <p className="text-[11px] text-muted-foreground">{inv.clientEmail}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <p>Issued: {new Date(inv.issueDate).toLocaleDateString()}</p>
                        <p className="text-[11px] font-medium text-foreground">
                          Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-foreground text-sm">
                          {money(inv.totalAmount, inv.currency)}
                        </p>
                        {inv.status === "Paid" && (
                          <p className="text-[10px] text-emerald-600 font-mono">
                            Reserve rule applied
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewInvoice(inv)}
                          className="h-8 px-2 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>

                        {inv.status === "Draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleSendInvoice(inv.id)}
                            className="h-8 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Mark sent
                          </Button>
                        )}

                        {(inv.status === "Sent" || inv.status === "Viewed" || inv.status === "PartiallyPaid" || inv.status === "Overdue") && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setInvoiceToPay(inv);
                              setPayModalOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs font-semibold shadow-xs"
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1" />
                            Record Payment
                          </Button>
                        )}
                        {(inv.status === "Draft" || (["Sent", "Viewed", "Overdue"].includes(inv.status) && inv.amountPaid === 0)) && (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => setDestructiveTarget(inv)}>
                            {inv.status === "Draft" ? "Delete draft" : "Cancel"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals & Dialogs */}
        <CreateInvoiceDialog
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          clients={clients}
          projects={projects}
          defaultCurrency={user?.preferredCurrency}
          onInvoiceCreated={loadData}
        />

        <RecordPaymentDialog
          open={payModalOpen}
          onOpenChange={setPayModalOpen}
          invoice={invoiceToPay}
          taxRule={taxRule}
          onPaymentSuccess={setCelebrationData}
          onRefresh={loadData}
        />

        <InvoiceDetailDialog
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
          renderStatusBadge={getStatusBadge}
        />

        <CancelInvoiceDialog
          target={destructiveTarget}
          onClose={() => setDestructiveTarget(null)}
          onConfirm={handleInvoiceDestructiveAction}
          pending={destructivePending}
        />

        <InvoiceCelebrationModal
          data={celebrationData}
          taxRuleEnabled={taxRule.enabled}
          onClose={() => setCelebrationData(null)}
        />
      </div>
    </DashboardLayout>
  );
};

export default InvoicesList;
