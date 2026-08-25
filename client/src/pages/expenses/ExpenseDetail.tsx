import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { expenseService, Expense } from "@/services/expenseService";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Download,
  History,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";

const ExpenseDetail = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchExpense = async () => {
      if (!id) return;
      const result = await expenseService.getById(id);
      if (result.success && result.data) {
        setExpense(result.data);
      } else {
        setError(result.error || "Failed to fetch expense");
      }
      setIsLoading(false);
    };

    fetchExpense();
  }, [id]);

  const handleSubmit = async () => {
    if (!expense) return;
    setIsSubmitting(true);
    const result = await expenseService.submit(expense.id);
    if (result.success) {
      setExpense(result.data || null);
    } else {
      setError(result.error || "Failed to submit expense");
    }
    setIsSubmitting(false);
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case "High":
        return <Badge variant="high">High Risk</Badge>;
      case "Medium":
        return <Badge variant="medium">Medium Risk</Badge>;
      case "Low":
      default:
        return <Badge variant="low">Low Risk</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!expense) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-lg mx-auto py-12 text-center">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Expense claim not found"}</AlertDescription>
          </Alert>
          <Button variant="outline" size="xs" onClick={() => navigate("/expenses")}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Transactions
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const riskAssessment = expense.riskAssessment;
  const reviewAssistant = expense.reviewAssistant;

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl mx-auto font-sans">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => navigate("/expenses")}
              title="Back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  {expense.merchant}
                </h1>
                {getStatusBadge(expense.status)}
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                ID: {expense.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/manager/audit/${expense.id}`}>
              <Button size="xs" variant="outline" className="gap-1.5 font-medium">
                <History className="h-3 w-3" />
                <span>Audit Trail</span>
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Main 2-Column Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Primary Details Card */}
            <Card>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle>Transaction Overview</CardTitle>
                <CardDescription>Verified claim metadata and business purpose</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Amount
                    </p>
                    <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Category
                    </p>
                    <p className="text-xs font-semibold text-foreground mt-1">
                      {expense.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Date
                    </p>
                    <p className="text-xs font-mono font-semibold text-foreground mt-1">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Currency
                    </p>
                    <p className="text-xs font-mono font-semibold text-foreground mt-1">
                      {expense.currency}
                    </p>
                  </div>
                </div>

                {expense.description && (
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                      Memo & Purpose
                    </p>
                    <p className="text-xs text-foreground leading-relaxed">
                      {expense.description}
                    </p>
                  </div>
                )}

                {expense.flagged && (
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-medium">
                      Policy Flag: {expense.flagReason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Timestamps */}
                <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-muted-foreground pt-2 border-t border-border/40">
                  <span>CREATED: {new Date(expense.createdAt).toLocaleString()}</span>
                  {expense.updatedAt && (
                    <span>UPDATED: {new Date(expense.updatedAt).toLocaleString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment Card */}
            {riskAssessment && (
              <Card>
                <CardHeader className="border-b border-border/60 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-foreground" />
                      <CardTitle>Policy & Risk Intelligence</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRiskBadge(riskAssessment.riskLevel)}
                      <span className="font-mono text-xs font-bold text-foreground">
                        {riskAssessment.riskScore}/100
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3.5">
                  {riskAssessment.policyTriggers && riskAssessment.policyTriggers.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">
                        Triggered Policy Rules
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {riskAssessment.policyTriggers.map((trig, idx) => (
                          <Badge key={idx} variant="destructive" className="text-[10px]">
                            {trig}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {riskAssessment.riskReasons && riskAssessment.riskReasons.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">
                        Risk Analysis Breakdown
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {riskAssessment.riskReasons.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Review Assistant Card */}
            {reviewAssistant && (
              <Card>
                <CardHeader className="border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-foreground" />
                    <CardTitle>Reviewer Copilot Analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  {reviewAssistant.recommendation && (
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                        System Recommendation
                      </p>
                      <p className="font-semibold text-foreground">
                        {reviewAssistant.recommendation}
                      </p>
                    </div>
                  )}

                  {reviewAssistant.summary && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                        Claim Digest
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        {reviewAssistant.summary}
                      </p>
                    </div>
                  )}

                  {reviewAssistant.missingEvidence && reviewAssistant.missingEvidence.length > 0 && (
                    <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                      <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider mb-1">
                        Missing Audit Documentation
                      </p>
                      <ul className="space-y-1 text-muted-foreground">
                        {reviewAssistant.missingEvidence.map((m, idx) => (
                          <li key={idx} className="flex gap-1.5 text-red-700 dark:text-red-400">
                            • {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Action Sidebar Card */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle>Workflow Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {expense.status === "Draft" && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    variant="signal"
                    className="w-full h-9 font-bold text-xs"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isSubmitting ? "Submitting..." : "Submit for Manager Review"}
                  </Button>
                )}

                {expense.status === "Pending" && (
                  <div className="rounded-md border border-amber-600/20 bg-amber-500/10 p-3 text-xs">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Awaiting Manager Decision</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      This claim is queued in the review console.
                    </p>
                  </div>
                )}

                {expense.status === "Approved" && (
                  <div className="rounded-md border border-emerald-600/20 bg-emerald-500/10 p-3 text-xs">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">Authorized & Approved</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Cleared internal controls and ready for ledger posting.
                    </p>
                  </div>
                )}

                {expense.status === "Rejected" && (
                  <div className="rounded-md border border-red-600/20 bg-red-500/10 p-3 text-xs">
                    <p className="font-semibold text-red-800 dark:text-red-300">Claim Rejected</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      {expense.flagReason || "Rejected during manager review."}
                    </p>
                  </div>
                )}

                {/* Receipt Preview/Link if available */}
                {expense.receiptUrl && (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                      Attached Receipt
                    </p>
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-secondary transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground truncate">View Document</span>
                      </div>
                      <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ExpenseDetail;
