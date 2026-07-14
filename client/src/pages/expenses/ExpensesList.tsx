import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { expenseService, Expense } from "@/services/expenseService";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SpreadsheetGrid } from "@/components/expenses/SpreadsheetGrid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  LayoutGrid, 
  TableProperties, 
  Cpu, 
  ShieldCheck 
} from "lucide-react";

const ALL_STATUSES = "all-statuses";
const ALL_RISKS = "all-risks";
const SORT_MOST_RISKY = "most-risky";
const SORT_LEAST_RISKY = "least-risky";
const SORT_NEWEST = "newest";

const ExpensesList = () => {
  const { user } = useAuth();
  const canUseSubmitterFeatures = user?.role === "Owner" || user?.role === "Member";
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [riskFilter, setRiskFilter] = useState(ALL_RISKS);
  const [sortMode, setSortMode] = useState(SORT_MOST_RISKY);
  
  const [viewMode, setViewMode] = useState<"list" | "spreadsheet">("list");

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

      if (sortMode === SORT_NEWEST) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return (b.riskAssessment?.riskScore || 0) - (a.riskAssessment?.riskScore || 0);
    });

    setFilteredExpenses(filtered);
  }, [expenses, statusFilter, riskFilter, sortMode]);

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      Draft: "bg-muted text-muted-foreground border-border",
      Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      Approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      Rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    };
    return (
      <Badge 
        variant="outline" 
        className={`text-[10px] px-2 py-0.5 rounded ${variants[status] || "bg-muted text-muted-foreground border-border"}`}
      >
        {status}
      </Badge>
    );
  };

  const getRiskBadge = (level: string) => {
    const variants: { [key: string]: string } = {
      High: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 font-bold",
      Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      Low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
    return (
      <Badge 
        variant="outline" 
        className={`text-[10px] px-2 py-0.5 rounded ${variants[level] || "bg-muted text-muted-foreground border-border"}`}
      >
        {level}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      const result = await expenseService.delete(id);
      if (result.success) {
        setExpenses(expenses.filter((e) => e.id !== id));
      }
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card/65 p-6 shadow-xl backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono tracking-[0.28em] text-primary bg-primary/5 px-2 py-0.5 border border-primary/10 rounded">
                Audit Registry
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                <Cpu className="h-3 w-3 text-primary animate-pulse" />
                VeriSpend Guardrails Enabled
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Expenses</h1>
            <p className="text-sm text-muted-foreground">
              View, filter, and manage your company expense claims and audit compliance logs.
            </p>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* View toggles */}
            <div className="flex items-center bg-muted p-1 border border-border rounded-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-full px-3 py-1 h-7 text-xs font-semibold gap-1.5 transition-all ${
                  viewMode === "list" 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                List View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("spreadsheet")}
                className={`rounded-full px-3 py-1 h-7 text-xs font-semibold gap-1.5 transition-all ${
                  viewMode === "spreadsheet" 
                    ? "bg-primary text-primary-foreground font-bold shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                }`}
              >
                <TableProperties className="h-3.5 w-3.5" />
                Spreadsheet View 📊
              </Button>
            </div>

            {canUseSubmitterFeatures && (
              <Button asChild className="w-full gap-1.5 rounded-full px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md sm:w-auto">
                <Link to="/expenses/create">
                  <Plus className="h-4 w-4" />
                  New Expense
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid gap-4 rounded-3xl border border-border bg-card/65 p-4 shadow-xl backdrop-blur-md md:grid-cols-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold block">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold block">AI Risk Level</span>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20">
                <SelectValue placeholder="Filter by risk level" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                <SelectItem value={ALL_RISKS}>All risk levels</SelectItem>
                <SelectItem value="Low">Low Risk</SelectItem>
                <SelectItem value="Medium">Medium Risk</SelectItem>
                <SelectItem value="High">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold block">Sort Order</span>
            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                <SelectItem value={SORT_MOST_RISKY}>Most risky first</SelectItem>
                <SelectItem value={SORT_LEAST_RISKY}>Least risky first</SelectItem>
                <SelectItem value={SORT_NEWEST}>Newest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Mode Router */}
        {viewMode === "spreadsheet" ? (
          <SpreadsheetGrid 
            initialExpenses={filteredExpenses} 
            onSaved={fetchExpenses} 
            userRole={user?.role} 
          />
        ) : (
          /* Classic Grid Table */
          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border px-6 py-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground text-lg font-bold tracking-tight">Expense Records</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-mono">
                    Total: {filteredExpenses.length} expenses
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                  <ShieldCheck className="h-4 w-4" />
                  Compliance Audited
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/60 mb-4 animate-pulse" />
                  <p className="text-muted-foreground text-sm mb-4">No expenses found</p>
                  {canUseSubmitterFeatures && (
                    <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 text-xs">
                      <Link to="/expenses/create">Add New Expense</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40 border-b border-border">
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="text-muted-foreground h-10">Date</TableHead>
                        <TableHead className="text-muted-foreground h-10">Merchant</TableHead>
                        <TableHead className="text-muted-foreground h-10">Category</TableHead>
                        <TableHead className="text-muted-foreground h-10">Amount</TableHead>
                        <TableHead className="text-muted-foreground h-10">Status</TableHead>
                        <TableHead className="text-muted-foreground h-10">Risk Index</TableHead>
                        <TableHead className="text-muted-foreground h-10">AI Analysis Summary</TableHead>
                        <TableHead className="text-right text-muted-foreground h-10">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-muted/20 border-b border-border transition-colors">
                          <TableCell className="font-mono text-foreground">
                            {formatDate(expense.date)}
                          </TableCell>
                          <TableCell className="text-foreground font-semibold">{expense.merchant}</TableCell>
                          <TableCell className="text-muted-foreground">{expense.category}</TableCell>
                          <TableCell className="font-bold text-foreground font-mono">
                            {formatCurrency(expense.amount, expense.currency)}
                          </TableCell>
                          <TableCell>{getStatusBadge(expense.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {expense.riskAssessment && (
                                <>
                                  {getRiskBadge(expense.riskAssessment.riskLevel)}
                                  <span className="text-xs text-muted-foreground font-mono font-semibold">
                                    {expense.riskAssessment.riskScore}%
                                  </span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[260px] text-xs text-muted-foreground/80 truncate font-sans">
                            {expense.riskAssessment?.riskReasons?.[0] || "Passes all automated guardrails"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Link to={`/expenses/${expense.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              {expense.status === "Draft" && user?.role !== "Manager" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(expense.id)}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExpensesList;
