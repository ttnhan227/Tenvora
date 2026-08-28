import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { expenseService, Expense } from "@/services/expenseService";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SpreadsheetGrid } from "@/components/expenses/SpreadsheetGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Eye,
  Trash2,
  Loader2,
  Plus,
  TableProperties,
  Upload,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const ALL_STATUSES = "all-statuses";
const ALL_RISKS = "all-risks";
const SORT_MOST_RISKY = "most-risky";
const SORT_LEAST_RISKY = "least-risky";
const SORT_NEWEST = "newest";
const SORT_AMOUNT_DESC = "amount-desc";

const ExpensesList = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [riskFilter, setRiskFilter] = useState(ALL_RISKS);
  const [sortMode, setSortMode] = useState(SORT_NEWEST);
  const [viewMode, setViewMode] = useState<"list" | "spreadsheet">("list");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    const result = await expenseService.getAll();
    if (result.success && result.data) {
      setExpenses(result.data);
      setFilteredExpenses(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    let filtered = expenses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.merchant.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== ALL_STATUSES) {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    if (riskFilter !== ALL_RISKS) {
      filtered = filtered.filter((e) => e.riskAssessment?.riskLevel === riskFilter);
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortMode === SORT_LEAST_RISKY) {
        return (a.riskAssessment?.riskScore || 0) - (b.riskAssessment?.riskScore || 0);
      }
      if (sortMode === SORT_MOST_RISKY) {
        return (b.riskAssessment?.riskScore || 0) - (a.riskAssessment?.riskScore || 0);
      }
      if (sortMode === SORT_AMOUNT_DESC) {
        return b.amount - a.amount;
      }
      return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
    });

    setFilteredExpenses(filtered);
  }, [expenses, searchQuery, statusFilter, riskFilter, sortMode]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this expense transaction?")) return;
    setDeletingId(id);
    const result = await expenseService.delete(id);
    if (result.success) {
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    }
    setDeletingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge variant="success">Approved</Badge>;
      case "Pending":
        return <Badge variant="warning">Pending Review</Badge>;
      case "Rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "Draft":
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const getRiskBadge = (level?: string, score?: number) => {
    if (!level) return <span className="text-muted-foreground text-[11px]">—</span>;
    const variantMap: Record<string, "high" | "medium" | "low" | "outline"> = {
      High: "high",
      Medium: "medium",
      Low: "low",
    };
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant={variantMap[level] || "outline"}>{level}</Badge>
        {score !== undefined && (
          <span className="font-mono text-[10px] text-muted-foreground font-semibold">
            {score}/100
          </span>
        )}
      </div>
    );
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Metrics computation
  const totalVolume = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === "Pending").length;
  const highRiskCount = expenses.filter((e) => e.riskAssessment?.riskLevel === "High").length;

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Transactions</h1>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {filteredExpenses.length} records
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive organization ledger with real-time risk scoring and policy audits.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <Link to="/upload">
              <Button size="xs" variant="outline" className="gap-1.5 font-semibold">
                <Upload className="h-3 w-3" />
                <span>Upload Receipt</span>
              </Button>
            </Link>
            <Link to="/expenses/create">
              <Button size="xs" variant="default" className="gap-1.5 font-bold">
                <Plus className="h-3 w-3" />
                <span>New Expense</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Executive Metrics Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Volume
            </p>
            <p className="mt-1 text-lg font-bold text-foreground font-mono">
              {formatCurrency(totalVolume)}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Approvals
            </p>
            <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400 font-mono">
              {pendingCount} claims
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Flagged Anomalies
            </p>
            <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-400 font-mono">
              {highRiskCount} high risk
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Entry Mode
            </p>
            <div className="mt-1 flex items-center gap-1">
              <Button
                size="xs"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                onClick={() => setViewMode("list")}
                className="h-6 text-[11px] px-2 font-medium"
              >
                <Layers className="h-3 w-3 mr-1" /> List View
              </Button>
              <Button
                size="xs"
                variant={viewMode === "spreadsheet" ? "secondary" : "ghost"}
                onClick={() => setViewMode("spreadsheet")}
                className="h-6 text-[11px] px-2 font-medium"
              >
                <FileSpreadsheet className="h-3 w-3 mr-1" /> Ledger Grid
              </Button>
            </div>
          </div>
        </div>

        {/* Department Budget & Spend Controls Strip */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Department Budgets */}
          <div className="md:col-span-8 rounded-lg border border-border bg-card p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Q3 Department Budget Allocations
              </span>
              <span className="text-[11px] text-muted-foreground">
                Total Budget: $95,000 · 77% Utilized
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">Engineering</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">$42.5k / $50k</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">Sales &amp; Growth</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">$18.2k / $25k</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: "72%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">Operations</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">$12.9k / $20k</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "64%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Corporate Card & Accounting Sync */}
          <div className="md:col-span-4 rounded-lg border border-border bg-card p-3.5 shadow-sm flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Corporate Visa</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                •••• 4092
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Monthly Card Limit</span>
              <span className="font-bold text-foreground">$10,000 / mo</span>
            </div>
            <div className="pt-1.5 border-t border-border flex items-center justify-between text-[10px]">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                NetSuite &amp; QuickBooks Synced
              </span>
              <span className="text-muted-foreground">2m ago</span>
            </div>
          </div>
        </div>

        {/* Recent Receipts & Attached Invoices Strip */}
        <div className="rounded-lg border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-semibold text-foreground">
                Recent Receipts &amp; Attached Invoices
              </p>
            </div>
            <span className="text-xs text-muted-foreground">3 Attached Documents</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Thumb 1: Dining */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors">
              <img
                src="/receipt-restaurant.jpg"
                alt="Dining Receipt"
                className="w-11 h-11 rounded-md object-cover border border-border shrink-0 shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate text-xs">The Capital Grille</p>
                <p className="text-[11px] text-muted-foreground">$286.20 · Scanned Receipt</p>
                <span className="inline-block text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  Needs Attendee List
                </span>
              </div>
            </div>

            {/* Thumb 2: Cloud Invoice */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors">
              <img
                src="/invoice-saas-cloud.jpg"
                alt="AWS Cloud Invoice"
                className="w-11 h-11 rounded-md object-cover border border-border shrink-0 bg-white shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate text-xs">Amazon Web Services</p>
                <p className="text-[11px] text-muted-foreground">$1,420.50 · Monthly Invoice</p>
                <span className="inline-block text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  ✓ Contract Matched
                </span>
              </div>
            </div>

            {/* Thumb 3: Travel */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors">
              <img
                src="/travel-expense.jpg"
                alt="Travel Flight Itinerary"
                className="w-11 h-11 rounded-md object-cover border border-border shrink-0 shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate text-xs">Delta Air Lines</p>
                <p className="text-[11px] text-muted-foreground">$1,486.40 · Flight Itinerary</p>
                <span className="inline-block text-[11px] text-red-700 dark:text-red-400 font-medium">
                  Requires Approval
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fast Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-medium text-muted-foreground shrink-0">Quick Views:</span>
          <button
            onClick={() => setStatusFilter(ALL_STATUSES)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 ${
              statusFilter === ALL_STATUSES
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            All Ledger Records ({expenses.length})
          </button>
          <button
            onClick={() => setStatusFilter("Pending")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 ${
              statusFilter === "Pending"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            Needs Approval (2)
          </button>
          <button
            onClick={() => setRiskFilter("High")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 ${
              riskFilter === "High"
                ? "bg-red-600 text-white border-red-600"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            High Risk &gt;$500 (1)
          </button>
          <button
            onClick={() => setStatusFilter("Approved")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 ${
              statusFilter === "Approved"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            Auto-Approved (2)
          </button>
        </div>
        {viewMode === "spreadsheet" ? (
          <SpreadsheetGrid initialExpenses={expenses} onSaved={fetchExpenses} userRole={user?.role} />
        ) : (
          /* View Mode: Dense Table */
          <div className="space-y-3">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-border bg-card p-2.5">
              <div className="flex flex-1 items-center gap-2 min-w-[200px] max-w-sm">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search merchant, category, memo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status selector */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-background">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value={ALL_STATUSES}>All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>

                {/* Risk selector */}
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="h-8 w-28 text-xs bg-background">
                    <SelectValue placeholder="All Risks" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value={ALL_RISKS}>All Risks</SelectItem>
                    <SelectItem value="High">High Risk</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low Risk</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort selector */}
                <Select value={sortMode} onValueChange={setSortMode}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-background">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value={SORT_NEWEST}>Newest First</SelectItem>
                    <SelectItem value={SORT_AMOUNT_DESC}>Highest Amount</SelectItem>
                    <SelectItem value={SORT_MOST_RISKY}>Highest Risk</SelectItem>
                    <SelectItem value={SORT_LEAST_RISKY}>Lowest Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table Container */}
            <div className="rounded-md border border-border bg-card overflow-hidden">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                    <TableProperties className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No transactions found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {expenses.length === 0
                      ? "Create your first company expense or upload a receipt to initiate verified spend controls."
                      : "No transactions match the selected filter criteria. Try resetting your search filters."}
                  </p>
                  {expenses.length === 0 && (
                    <Link to="/expenses/create" className="mt-4">
                      <Button size="xs" variant="default">
                        <Plus className="h-3 w-3 mr-1" /> Create Expense
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead>Merchant / Vendor</TableHead>
                      <TableHead className="w-32">Category</TableHead>
                      <TableHead className="w-36">Risk Level</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="text-right w-32">Amount</TableHead>
                      <TableHead className="text-right w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="group">
                        <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDate(expense.date || expense.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                to={`/expenses/${expense.id}`}
                                className="font-semibold text-foreground hover:underline flex items-center gap-1.5"
                              >
                                <span className="truncate max-w-[180px] sm:max-w-xs text-xs">
                                  {expense.merchant}
                                </span>
                                {expense.receiptUrl && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                    Receipt Attached
                                  </span>
                                )}
                              </Link>
                              {expense.description && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-sm mt-0.5">
                                  {expense.description}
                                </p>
                              )}
                            </div>

                            {/* Employee Submitter Tag */}
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 border border-border/60 px-1.5 py-0.5 rounded shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {expense.merchant?.includes("Capital")
                                ? "Sarah Chen (VP Eng)"
                                : expense.merchant?.includes("OpenAI")
                                ? "Elena Rostova (Staff AI)"
                                : expense.merchant?.includes("Delta")
                                ? "Marcus Vance (Growth)"
                                : "Alex Morgan (Ops)"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-block px-2 py-0.5 rounded bg-muted/60 text-[10px] font-medium text-foreground">
                            {expense.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getRiskBadge(
                            expense.riskAssessment?.riskLevel,
                            expense.riskAssessment?.riskScore
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(expense.status)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground tabular-nums whitespace-nowrap">
                          {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/expenses/${expense.id}`}>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            {expense.status === "Draft" && (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={(e) => handleDelete(expense.id, e)}
                                disabled={deletingId === expense.id}
                                title="Delete Draft"
                              >
                                {deletingId === expense.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExpensesList;
