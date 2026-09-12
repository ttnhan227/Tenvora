import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkspaceAiInsight } from "@/components/assistant/WorkspaceAiInsight";
import {
  invoiceService,
  InvoiceSummary,
  InvoiceStats,
  CreateInvoiceRequest,
  CreateInvoiceItemRequest,
} from "@/services/invoiceService";
import { clientService, ClientSummary } from "@/services/clientService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { taxService } from "@/services/taxService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Download,
  Eye,
  DollarSign,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const InvoicesList: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [taxRule, setTaxRule] = useState({ enabled: false, rate: 25 });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Celebration Modal state
  const [celebrationData, setCelebrationData] = useState<{
    invoiceNumber: string;
    clientName: string;
    amount: number;
    currency: string;
    autoTaxSetAside: boolean;
    taxRate: number;
  } | null>(null);

  // New Invoice Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [currency, setCurrency] = useState(user?.preferredCurrency || "USD");
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const [notes, setNotes] = useState("Thank you for your business! Payment due within terms.");
  const [lineItems, setLineItems] = useState<CreateInvoiceItemRequest[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  // Payment Recording Modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<InvoiceSummary | null>(null);
  const [autoTaxSetAside, setAutoTaxSetAside] = useState(false);
  const [paying, setPaying] = useState(false);

  // Invoice Detail / Receipt Modal state
  const [viewInvoice, setViewInvoice] = useState<InvoiceSummary | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const [invList, invStats, clientList, taxSummary] = await Promise.all([
        invoiceService.getInvoices(),
        invoiceService.getInvoiceStats(),
        clientService.getClients(),
        taxService.getTaxSummary(),
      ]);
      setInvoices(invList);
      setStats(invStats);
      setClients(clientList);
      setTaxRule({ enabled: taxSummary.autoTaxSetAsideEnabled, rate: taxSummary.defaultTaxRatePercent });
      setAutoTaxSetAside(taxSummary.autoTaxSetAsideEnabled);
      if (clientList.length > 0 && !selectedClientId) {
        const firstClient = clientList[0];
        setSelectedClientId(firstClient.id);
        setCurrency(firstClient.currency || user?.preferredCurrency || "USD");
        setPaymentTerms(firstClient.defaultPaymentTermsDays > 0
          ? `Net ${firstClient.defaultPaymentTermsDays}`
          : "Due on Receipt");
      }
    } catch (err) {
      console.error("Failed to load invoices:", err);
      setLoadError("We couldn't load your invoices. Your data has not been changed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleLineItemChange = (index: number, field: keyof CreateInvoiceItemRequest, val: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: val };
    setLineItems(updated);
  };

  const handleClientSelection = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;

    setCurrency(client.currency || user?.preferredCurrency || "USD");
    setPaymentTerms(client.defaultPaymentTermsDays > 0
      ? `Net ${client.defaultPaymentTermsDays}`
      : "Due on Receipt");
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  };

  const formatMoney = (amount: number, moneyCurrency = currency) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: moneyCurrency,
    }).format(amount);

  const handleCreateInvoice = async (sendImmediately: boolean = false) => {
    setCreateError("");
    if (!selectedClientId) {
      setCreateError("Select the client you are billing.");
      return;
    }

    const validItems = lineItems.filter((item) => item.description.trim().length > 0);
    if (validItems.length === 0) {
      setCreateError("Add at least one billable item with a description, quantity, and unit price.");
      return;
    }

    if (validItems.some((item) => item.quantity <= 0 || item.unitPrice <= 0)) {
      setCreateError("Every billable item needs a quantity and unit price greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      const req: CreateInvoiceRequest = {
        clientId: selectedClientId,
        currency,
        paymentTerms,
        notes,
        items: validItems,
      };

      const created = await invoiceService.createInvoice(req);
      let markedAsSent = false;
      if (sendImmediately) {
        try {
          await invoiceService.sendInvoice(created.id);
          markedAsSent = true;
        } catch (sendError) {
          console.error("Invoice was saved but could not be marked as sent", sendError);
        }
      }
      setCreateModalOpen(false);
      setCreateError("");
      // Reset form
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      await loadData();
      if (sendImmediately && !markedAsSent) {
        toast.warning("Invoice draft saved, but it could not be marked as sent. Open the draft and try again.");
      } else {
        toast.success(sendImmediately
          ? "Invoice saved and marked as sent. Tenvora did not email the client."
          : "Invoice draft saved.");
      }
    } catch (err: any) {
      const message = err.response?.data?.errors?.join(" ") || err.response?.data?.message || "The invoice could not be saved. Review the form and try again.";
      setCreateError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await invoiceService.sendInvoice(invoiceId);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send invoice");
    }
  };

  const handleRecordPayment = async () => {
    if (!invoiceToPay) return;
    const remainingAmount = Math.max(0, invoiceToPay.totalAmount - invoiceToPay.amountPaid);
    try {
      setPaying(true);
      await invoiceService.payInvoice(invoiceToPay.id, {
        amount: remainingAmount,
        autoTaxSetAside,
      });
      const settled = {
        invoiceNumber: invoiceToPay.invoiceNumber,
        clientName: invoiceToPay.clientName,
        amount: remainingAmount,
        currency: invoiceToPay.currency,
        autoTaxSetAside,
        taxRate: taxRule.rate,
      };
      setPayModalOpen(false);
      setInvoiceToPay(null);
      setCelebrationData(settled);
      toast.success(`Payment recorded: ${formatMoney(remainingAmount, invoiceToPay.currency)} from ${invoiceToPay.clientName}. Your cash-flow estimate is updated.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  const clientFilter = searchParams.get("client");
  const activeClient = clients.find((client) => client.id === clientFilter);
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "open"
        ? inv.status === "Sent" || inv.status === "Viewed"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Invoiced ({stats?.currency ?? user?.preferredCurrency ?? "USD"})
            </p>
            <p className="text-2xl sm:text-3xl font-black text-foreground mt-1 font-mono">
              {formatMoney(stats?.totalInvoicedAmount ?? 0, stats?.currency ?? user?.preferredCurrency ?? "USD")}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 font-medium">
              <span>{stats?.totalInvoicesCount ?? 0} invoices in this currency</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Collected &amp; Paid</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatMoney(stats?.totalPaidAmount ?? 0, stats?.currency ?? user?.preferredCurrency ?? "USD")}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{stats?.paidInvoicesCount ?? 0} paid with tax reserve allocation</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Awaiting Payment</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {formatMoney(stats?.totalOutstandingAmount ?? 0, stats?.currency ?? user?.preferredCurrency ?? "USD")}
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
                          {formatMoney(inv.totalAmount, inv.currency)}
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

                        {(inv.status === "Sent" || inv.status === "Viewed" || inv.status === "Overdue") && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setInvoiceToPay(inv);
                              setAutoTaxSetAside(taxRule.enabled);
                              setPayModalOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs font-semibold shadow-xs"
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1" />
                            Record Payment
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

        {/* Create Invoice Dialog */}
        <Dialog
          open={createModalOpen}
          onOpenChange={(nextOpen) => {
            setCreateModalOpen(nextOpen);
            if (!nextOpen) setCreateError("");
          }}
        >
          <DialogContent className="max-w-2xl bg-card border border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Create New Client Invoice
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter the client and billable work. When you later confirm a payment, Tenvora can allocate your selected percentage to a tax-planning category.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Client Selector & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="invoice-client" className="text-xs font-semibold">Select Client</Label>
                  <Select value={selectedClientId} onValueChange={handleClientSelection}>
                    <SelectTrigger id="invoice-client" className="text-xs bg-background">
                      <SelectValue placeholder="Select a client..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name} ({c.contactEmail})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoice-currency" className="text-xs font-semibold">Billing Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="invoice-currency" className="text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="USD" className="text-xs">USD ($)</SelectItem>
                      <SelectItem value="EUR" className="text-xs">EUR (€)</SelectItem>
                      <SelectItem value="GBP" className="text-xs">GBP (£)</SelectItem>
                      <SelectItem value="SGD" className="text-xs">SGD (S$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Terms & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invoice-terms" className="text-xs font-semibold">Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger id="invoice-terms" className="text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="Due on Receipt" className="text-xs">Due on Receipt</SelectItem>
                      <SelectItem value="Net 7" className="text-xs">Net 7 (7 Days)</SelectItem>
                      <SelectItem value="Net 14" className="text-xs">Net 14 (14 Days)</SelectItem>
                      <SelectItem value="Net 30" className="text-xs">Net 30 (30 Days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoice-notes" className="text-xs font-semibold">Invoice Memo / Notes</Label>
                  <Input
                    id="invoice-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes visible on invoice..."
                    className="text-xs bg-background"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                The issue date is today. The due date is calculated from the selected payment terms.
              </p>

              {createError && (
                <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                  {createError}
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Billable Line Items
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}
                    className="h-7 text-xs gap-1 border-dashed"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Enter what you delivered, how many units or hours, and the price for each unit. Tenvora calculates each line total.
                </p>

                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_6rem_6rem_2rem] gap-2 px-1 text-[11px] font-semibold text-muted-foreground">
                  <span>Description</span>
                  <span>Quantity</span>
                  <span>Unit price</span>
                  <span className="text-right">Line total</span>
                  <span />
                </div>

                <div className="space-y-3 sm:space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_5rem_6rem_6rem_2rem] items-end gap-2 p-3 sm:p-0 rounded-lg sm:rounded-none bg-muted/20 sm:bg-transparent border sm:border-0 border-border/60">
                      <div className="col-span-2 sm:col-span-1 space-y-1">
                        <Label htmlFor={`invoice-item-description-${idx}`} className="text-[11px] font-semibold sm:sr-only">Description</Label>
                        <Input
                          id={`invoice-item-description-${idx}`}
                          placeholder="e.g. Website design"
                          value={item.description}
                          onChange={(e) => {
                            setCreateError("");
                            handleLineItemChange(idx, "description", e.target.value);
                          }}
                          className="w-full text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`invoice-item-quantity-${idx}`} className="text-[11px] font-semibold sm:sr-only">Quantity</Label>
                        <Input
                          id={`invoice-item-quantity-${idx}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`invoice-item-price-${idx}`} className="text-[11px] font-semibold sm:sr-only">Unit price ({currency})</Label>
                        <Input
                          id={`invoice-item-price-${idx}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-full text-xs bg-background"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:block pb-2 sm:pb-0">
                        <span className="text-[11px] font-semibold text-muted-foreground sm:sr-only">Line total</span>
                        <span className="block text-right text-xs font-mono font-bold">{formatMoney(item.quantity * item.unitPrice)}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex justify-end sm:block">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLineItem(idx)}
                          disabled={lineItems.length === 1}
                          aria-label={`Remove line item ${idx + 1}`}
                          title={lineItems.length === 1 ? "An invoice needs at least one line item" : "Remove line item"}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal summary */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between font-mono text-xs mt-3">
                  <span className="text-muted-foreground font-sans">Total Invoice Amount:</span>
                  <span className="text-base font-bold text-foreground">
                    {formatMoney(calculateSubtotal())}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={submitting}
                onClick={() => handleCreateInvoice(false)}
                className="text-xs"
              >
                Save as Draft
              </Button>
              <Button
                size="sm"
                disabled={submitting}
                onClick={() => handleCreateInvoice(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Save &amp; Mark as Sent
              </Button>
            </DialogFooter>
            <p className="text-center text-[11px] text-muted-foreground">
              “Mark as sent” updates tracking in Tenvora. It does not email your client.
            </p>
          </DialogContent>
        </Dialog>

        {/* Record Payment Dialog (With Auto Tax Set Aside Split Breakdown) */}
        <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
          <DialogContent className="max-w-md bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Record Client Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Mark {invoiceToPay?.invoiceNumber} from {invoiceToPay?.clientName} as paid.
              </DialogDescription>
            </DialogHeader>

            {invoiceToPay && (
              <div className="space-y-4 py-2">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Payment Amount</p>
                  <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatMoney(invoiceToPay.totalAmount - invoiceToPay.amountPaid, invoiceToPay.currency)}
                  </p>
                </div>

                {/* Tax Set-Aside Ring-Fence Box */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <Label htmlFor="apply-tax-reserve" className="cursor-pointer text-xs font-bold">Apply saved tax-reserve rule</Label>
                    </div>
                    <input
                      id="apply-tax-reserve"
                      type="checkbox"
                      checked={autoTaxSetAside}
                      onChange={(e) => setAutoTaxSetAside(e.target.checked)}
                      disabled={!taxRule.enabled}
                      className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                      aria-label="Apply saved tax-reserve rule"
                    />
                  </div>

                  {!taxRule.enabled ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 border-t border-border pt-2.5">
                      The saved reserve rule is off. Enable it in Tax settings before recording a payment if you want an automatic allocation.
                    </p>
                  ) : autoTaxSetAside ? (
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2.5">
                      Tenvora will apply the saved {taxRule.rate}% planning rate and record the allocation in the workspace ledger.
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Tax allocation disabled. The full payment will remain in the recorded operating balance.
                    </p>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPayModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={paying}
                    onClick={handleRecordPayment}
                    className="text-xs font-semibold"
                  >
                    {paying ? "Processing..." : "Confirm & Record Payment"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View / Print Invoice Modal */}
        <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
          <DialogContent className="max-w-xl bg-card border border-border">
            {viewInvoice && (
              <div className="space-y-6 py-2">
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div>
                    <h2 className="text-xl font-bold font-mono">{viewInvoice.invoiceNumber}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Issued on {new Date(viewInvoice.issueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>{getStatusBadge(viewInvoice.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Billed To</p>
                    <p className="font-bold text-foreground mt-0.5">{viewInvoice.clientName}</p>
                    <p className="text-muted-foreground">{viewInvoice.clientEmail}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">Payment Due</p>
                    <p className="font-bold text-foreground mt-0.5">
                      {new Date(viewInvoice.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-muted-foreground">{viewInvoice.paymentTerms || "Net 14"}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 font-mono text-[10px] text-muted-foreground border-b border-border uppercase">
                      <tr>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 text-right">Hours/Qty</th>
                        <th className="py-2 px-3 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewInvoice.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-2 px-3 font-medium text-foreground">{it.description}</td>
                          <td className="py-2 px-3 text-right font-mono">{it.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatMoney(it.unitPrice, viewInvoice.currency)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{formatMoney(it.amount, viewInvoice.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/40 font-mono text-xs">
                  <span className="text-muted-foreground">Total Due:</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatMoney(viewInvoice.totalAmount, viewInvoice.currency)}
                  </span>
                </div>

                {viewInvoice.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: {viewInvoice.notes}
                  </p>
                )}

                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewInvoice(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Celebratory Payment Received Dialog */}
        <Dialog open={!!celebrationData} onOpenChange={() => setCelebrationData(null)}>
          <DialogContent className="max-w-md bg-card border-2 border-emerald-500/30 text-center p-6 space-y-4">
            {celebrationData && (
              <div className="space-y-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl shadow-sm animate-bounce">
                  🎉
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-foreground tracking-tight">
                    Cha-ching! Payment Received!
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Invoice <span className="font-mono font-bold text-foreground">{celebrationData.invoiceNumber}</span> from <span className="font-semibold text-foreground">{celebrationData.clientName}</span> is officially settled.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2.5">
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatMoney(celebrationData.amount, celebrationData.currency)}
                  </div>

                  {celebrationData.autoTaxSetAside && taxRule.enabled ? (
                    <div className="space-y-2 pt-2 border-t border-border/80 text-xs text-left">
                      <div className="flex justify-between items-center p-2 rounded-xl bg-background border border-border/60">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-bold text-foreground">Recorded operating balance ({100 - celebrationData.taxRate}%)</p>
                            <p className="text-[10px] text-muted-foreground">Recorded operating balance</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatMoney(celebrationData.amount * ((100 - celebrationData.taxRate) / 100), celebrationData.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <p className="font-bold text-amber-700 dark:text-amber-400">Tax reserve ({celebrationData.taxRate}%)</p>
                            <p className="text-[10px] text-muted-foreground">Planning estimate—not money held</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                          +{formatMoney(celebrationData.amount * (celebrationData.taxRate / 100), celebrationData.currency)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      The full payment was added to your recorded operating balance.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => setCelebrationData(null)}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9"
                  >
                    Awesome, Back to Invoices
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default InvoicesList;
