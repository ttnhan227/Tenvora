import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { expenseService, Expense } from "@/services/expenseService";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle, AlertCircle, ShieldAlert, Sparkles } from "lucide-react";

const ExpenseDetail = () => {
  const { user } = useAuth();
  const canUseSubmitterFeatures = user?.role === "Owner" || user?.role === "Member";
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
        className={`font-mono text-[10px] px-2.5 py-0.5 rounded ${variants[level] || "bg-muted text-muted-foreground border-border"}`}
      >
        {level}
      </Badge>
    );
  };

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
        className={`font-mono text-[10px] px-3 py-1 rounded-lg ${variants[status] || "bg-muted text-muted-foreground border-border"}`}
      >
        {status}
      </Badge>
    );
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

  if (!expense) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => navigate("/expenses")} className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Expenses
          </Button>
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Expense not found"}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const riskAssessment = expense.riskAssessment;
  const reviewAssistant = expense.reviewAssistant;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl font-sans">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/expenses")}
            className="rounded-lg h-9 w-9 border-border text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{expense.merchant}</h1>
              {getStatusBadge(expense.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Claim ID: <span className="font-mono">{expense.id}</span>
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Info Columns */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Expense Info & AI Risk */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Expense details Card */}
            <Card className="rounded-xl border border-border bg-card overflow-hidden">
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-sm font-bold">Transaction Overview</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Claim breakdown and business purpose</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Amount</p>
                    <p className="text-3xl font-bold text-foreground font-mono mt-1">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Merchant / Vendor</p>
                    <p className="text-lg font-bold text-foreground mt-1">{expense.merchant}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Spend Category</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{expense.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Transaction Date</p>
                    <p className="text-sm font-semibold text-foreground font-mono mt-1">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                </div>

                {expense.description && (
                  <>
                    <Separator className="bg-border" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Description / Purpose</p>
                      <p className="text-sm text-foreground bg-muted/30 p-3 rounded-2xl border border-border leading-relaxed">
                        {expense.description}
                      </p>
                    </div>
                  </>
                )}

                {expense.flagged && (
                  <>
                    <Separator className="bg-border" />
                    <Alert variant="destructive" className="rounded-2xl">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs font-semibold">
                        Policy Warning Flag: {expense.flagReason}
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                {/* Date stamps */}
                <Separator className="bg-border" />
                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-muted-foreground font-mono">
                  <p>RECORDED TIME: {new Date(expense.createdAt).toLocaleString()}</p>
                  {expense.updatedAt && (
                    <p className="sm:text-right">LAST UPDATE: {new Date(expense.updatedAt).toLocaleString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment Card */}
            {riskAssessment && (
              <Card className={`rounded-xl border border-border overflow-hidden ${
                riskAssessment.riskLevel === "High" ? "bg-red-500/[0.02]" : "bg-card"
              }`}>
                <CardHeader className="border-b border-border px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-bold">Policy & Risk Evaluation</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRiskBadge(riskAssessment.riskLevel)}
                      <span className="text-xs font-mono text-muted-foreground">{riskAssessment.riskScore}% risk</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {riskAssessment.policyTriggers.length > 0 && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-2">Triggered Policy Rules:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {riskAssessment.policyTriggers.map((trigger, idx) => (
                          <Badge key={idx} variant="destructive" className="text-[10px] px-2.5 py-0.5 rounded font-medium">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {riskAssessment.riskReasons.length > 0 && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-2">Evaluation Findings:</p>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        {riskAssessment.riskReasons.map((reason, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-primary font-bold">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Review Insights Card */}
            {reviewAssistant && (
              <Card className="rounded-xl border border-border bg-card overflow-hidden">
                <CardHeader className="border-b border-border px-6 py-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-bold">Review Assistant Insights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {reviewAssistant.recommendation && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1">Recommendation</p>
                      <p className="text-xs text-foreground bg-muted/40 border border-border p-3 rounded-lg leading-relaxed font-medium">
                        {reviewAssistant.recommendation}
                      </p>
                    </div>
                  )}

                  {reviewAssistant.summary && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1">Summary</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{reviewAssistant.summary}</p>
                    </div>
                  )}

                  {reviewAssistant.missingEvidence && reviewAssistant.missingEvidence.length > 0 && (
                    <div>
                      <p className="text-xs uppercase text-red-500 font-bold tracking-wider mb-1.5">Missing Documentation</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {reviewAssistant.missingEvidence.map((item, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reviewAssistant.reviewerPrompts && reviewAssistant.reviewerPrompts.length > 0 && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1.5">Reviewer Checklist</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {reviewAssistant.reviewerPrompts.slice(0, 3).map((prompt, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-primary font-bold">•</span>
                            <span>{prompt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-4">
            <Card className="rounded-xl border border-border bg-card sticky top-4 overflow-hidden">
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-sm font-bold">Claim Status & Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {expense.status === "Draft" && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full gap-2 rounded-lg px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 text-xs shadow-sm"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Submitting..." : "Submit for Manager Review"}
                  </Button>
                )}

                {expense.status === "Pending" && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs">
                    <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Awaiting Review</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Your claim is in the manager review queue. You will be notified once a decision is made.
                    </p>
                  </div>
                )}

                {expense.status === "Approved" && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs flex gap-2.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">Claim Approved</p>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">This claim has cleared governance review and is authorized for reimbursement.</p>
                    </div>
                  </div>
                )}

                {expense.status === "Rejected" && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs">
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">Claim Rejected</p>
                    <p className="text-muted-foreground leading-relaxed">{expense.flagReason || "This claim was rejected during review."}</p>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full rounded-lg border-border hover:bg-muted text-foreground text-xs font-medium h-9"
                  onClick={() => navigate("/expenses")}
                >
                  Back to Expenses
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ExpenseDetail;
