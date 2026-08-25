import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { managerService, PendingExpense, AuditLog } from "@/services/managerService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  FileText,
  History,
  ShieldAlert,
  Download,
  Filter,
  Check,
  X,
  Sparkles,
} from "lucide-react";

const ALL_RISKS = "all-risks";
const ALL_RECOMMENDATIONS = "all-recommendations";

const ManagerPending = () => {
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<PendingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [riskFilter, setRiskFilter] = useState(ALL_RISKS);
  const [recommendationFilter, setRecommendationFilter] = useState(ALL_RECOMMENDATIONS);
  const [selectedExpense, setSelectedExpense] = useState<PendingExpense | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [actionInProgress, setActionInProgress] = useState("");
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [drawerExpense, setDrawerExpense] = useState<PendingExpense | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [feedbackRiskLevel, setFeedbackRiskLevel] = useState("Low");
  const [feedbackFalsePositive, setFeedbackFalsePositive] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [downloadingReceipt, setDownloadingReceipt] = useState<number | null>(null);

  const downloadReceipt = async (url: string, index: number) => {
    setDownloadingReceipt(index);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Receipt download failed");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `receipt-${index + 1}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingReceipt(null);
    }
  };

  useEffect(() => {
    const fetchPending = async () => {
      const result = await managerService.getPendingExpenses();
      if (result.success && result.data) {
        setExpenses(result.data);
        setFilteredExpenses(result.data);
      } else {
        setError(result.error || "Failed to fetch pending expenses");
      }
      setIsLoading(false);
    };

    fetchPending();
  }, []);

  useEffect(() => {
    let filtered = [...expenses];

    if (riskFilter !== ALL_RISKS) {
      filtered = filtered.filter((expense) => expense.riskAssessment.riskLevel === riskFilter);
    }

    if (recommendationFilter !== ALL_RECOMMENDATIONS) {
      filtered = filtered.filter((expense) => expense.reviewAssistant.recommendation === recommendationFilter);
    }

    filtered.sort((a, b) => b.riskAssessment.riskScore - a.riskAssessment.riskScore || a.reviewPriority - b.reviewPriority);
    setFilteredExpenses(filtered);
  }, [expenses, riskFilter, recommendationFilter]);

  const handleApprove = async (expenseId: string) => {
    setActionInProgress(expenseId);
    const result = await managerService.approve(expenseId);
    if (result.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    } else {
      setError(result.error || "Failed to approve expense");
    }
    setActionInProgress("");
  };

  const handleReject = async () => {
    if (!selectedExpense || !rejectReason.trim()) {
      setError("Please enter a rejection reason");
      return;
    }

    setActionInProgress(selectedExpense.id);
    const result = await managerService.reject(selectedExpense.id, {
      reason: rejectReason,
    });
    if (result.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== selectedExpense.id));
      setShowRejectDialog(false);
      setSelectedExpense(null);
      setRejectReason("");
    } else {
      setError(result.error || "Failed to reject expense");
    }
    setActionInProgress("");
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const highRiskCount = filteredExpenses.filter((expense) => expense.riskAssessment.riskLevel === "High").length;
  const escalateCount = filteredExpenses.filter((expense) => expense.reviewAssistant.recommendation === "Escalate").length;

  const openReviewDrawer = async (expense: PendingExpense) => {
    setDrawerExpense(expense);
    setFeedbackRiskLevel(expense.riskAssessment.riskLevel);
    setFeedbackFalsePositive(false);
    setFeedbackNotes("");
    setFeedbackStatus("");
    setReviewDrawerOpen(true);
    setAuditLogs([]);
    setIsLoadingAudit(true);
    const result = await managerService.getAuditTrail(expense.id);
    if (result.success && result.data) {
      setAuditLogs(result.data);
    }
    setIsLoadingAudit(false);
  };

  const handleSubmitFeedback = async () => {
    if (!drawerExpense) return;

    const result = await managerService.submitReviewFeedback(drawerExpense.id, {
      correctedRiskLevel: feedbackRiskLevel,
      wasFalsePositive: feedbackFalsePositive,
      notes: feedbackNotes || undefined,
    });

    if (result.success) {
      setFeedbackStatus("Classification feedback recorded into policy engine.");
      setFeedbackNotes("");
    } else {
      setError(result.error || "Failed to save feedback");
    }
  };

  const isPreviewableImage = (url: string) => {
    const normalized = url.toLowerCase();
    return normalized.startsWith("data:image/") || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(normalized);
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

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-7xl mx-auto font-sans">
        {/* Header Ribbon */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Review Queue</h1>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {filteredExpenses.length} awaiting decision
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Risk-ranked claim queue with explainable policy signals and one-click actions.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Executive Stats Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Queue Total
            </p>
            <p className="mt-1 text-lg font-bold text-foreground font-mono">
              {filteredExpenses.length}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              High Risk Claims
            </p>
            <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-400 font-mono">
              {highRiskCount}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Policy Escalations
            </p>
            <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400 font-mono">
              {escalateCount}
            </p>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-border bg-card p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-background">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value={ALL_RISKS}>All Risk Levels</SelectItem>
                <SelectItem value="High">High Risk</SelectItem>
                <SelectItem value="Medium">Medium Risk</SelectItem>
                <SelectItem value="Low">Low Risk</SelectItem>
              </SelectContent>
            </Select>

            <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
              <SelectTrigger className="h-8 w-44 text-xs bg-background">
                <SelectValue placeholder="AI Recommendation" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value={ALL_RECOMMENDATIONS}>All Recommendations</SelectItem>
                <SelectItem value="Approve with normal review">Normal Review</SelectItem>
                <SelectItem value="Needs review">Needs Review</SelectItem>
                <SelectItem value="Escalate">Escalate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Approval Queue Data Table */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Check className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Review Queue is Clear</p>
              <p className="text-xs text-muted-foreground mt-1">
                All submitted employee claims have been reviewed.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Pri</TableHead>
                  <TableHead className="w-48">Employee</TableHead>
                  <TableHead>Merchant / Date</TableHead>
                  <TableHead className="w-32">Risk Level</TableHead>
                  <TableHead className="w-44">Recommendation</TableHead>
                  <TableHead className="text-right w-32">Amount</TableHead>
                  <TableHead className="text-right w-32">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="group">
                    <TableCell className="text-center font-mono text-[10px] font-bold text-muted-foreground">
                      #{expense.reviewPriority}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground truncate block max-w-[180px]">
                        {expense.employeeEmail}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => openReviewDrawer(expense)}
                        className="font-semibold text-foreground hover:underline text-left block"
                      >
                        {expense.merchant}
                      </button>
                      <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">
                        {expense.category} • {formatDate(expense.date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            expense.riskAssessment.riskLevel === "High"
                              ? "high"
                              : expense.riskAssessment.riskLevel === "Medium"
                              ? "medium"
                              : "low"
                          }
                        >
                          {expense.riskAssessment.riskLevel}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {expense.riskAssessment.riskScore}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-foreground">
                          {expense.reviewAssistant.recommendation}
                        </p>
                        {expense.triggeredRuleCount > 0 && (
                          <span className="text-[10px] font-mono text-red-600 font-bold">
                            {expense.triggeredRuleCount} rule triggers
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground tabular-nums">
                      {formatCurrency(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => openReviewDrawer(expense)}
                          title="Inspect Details"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="default"
                          onClick={() => handleApprove(expense.id)}
                          disabled={actionInProgress === expense.id}
                          title="Approve"
                          className="h-7 w-7 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {actionInProgress === expense.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setShowRejectDialog(true);
                          }}
                          disabled={actionInProgress === expense.id}
                          title="Reject"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Slide-over Inspection Sheet */}
        <Sheet open={reviewDrawerOpen} onOpenChange={setReviewDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0 border-l border-border bg-card">
            {drawerExpense && (
              <>
                <SheetHeader className="px-5 py-4 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <SheetTitle className="text-sm font-bold text-foreground">
                        {drawerExpense.merchant}
                      </SheetTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted by {drawerExpense.employeeEmail} • {drawerExpense.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          drawerExpense.riskAssessment.riskLevel === "High"
                            ? "high"
                            : drawerExpense.riskAssessment.riskLevel === "Medium"
                            ? "medium"
                            : "low"
                        }
                      >
                        {drawerExpense.riskAssessment.riskLevel}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {drawerExpense.riskAssessment.riskScore}% risk
                      </span>
                    </div>
                  </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-5">
                  <div className="space-y-4 py-4 text-xs">
                    {/* Summary card */}
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        AI Recommendation Summary
                      </p>
                      <p className="text-foreground leading-relaxed">
                        {drawerExpense.reviewAssistant.summary}
                      </p>
                    </div>

                    {/* Metadata breakdown */}
                    <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-card p-3">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Amount</p>
                        <p className="font-mono text-base font-bold text-foreground mt-0.5">
                          {formatCurrency(drawerExpense.amount, drawerExpense.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Date</p>
                        <p className="font-mono text-xs font-semibold text-foreground mt-1">
                          {formatDate(drawerExpense.date)}
                        </p>
                      </div>
                      {drawerExpense.description && (
                        <div className="col-span-2 pt-2 border-t border-border/40">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Memo</p>
                          <p className="text-xs text-foreground mt-0.5">{drawerExpense.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Policy Triggers */}
                    {drawerExpense.riskAssessment.policyTriggers.length > 0 && (
                      <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Policy Violations Detected
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {drawerExpense.riskAssessment.policyTriggers.map((t, idx) => (
                            <Badge key={idx} variant="destructive" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Feedback Loop */}
                    <div className="rounded-md border border-border bg-card p-3.5 space-y-2.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                          Reviewer Calibration & Override
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Record manager corrections to improve automated rule accuracy.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Select value={feedbackRiskLevel} onValueChange={setFeedbackRiskLevel}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Corrected Risk" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="Low">Low Risk</SelectItem>
                            <SelectItem value="Medium">Medium Risk</SelectItem>
                            <SelectItem value="High">High Risk</SelectItem>
                          </SelectContent>
                        </Select>

                        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                          <Checkbox
                            checked={feedbackFalsePositive}
                            onCheckedChange={(c) => setFeedbackFalsePositive(c === true)}
                          />
                          <span>Mark rule trigger as false positive</span>
                        </label>

                        <Textarea
                          placeholder="Feedback notes for audit record..."
                          value={feedbackNotes}
                          onChange={(e) => setFeedbackNotes(e.target.value)}
                          rows={2}
                          className="text-xs resize-none"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={handleSubmitFeedback}
                        >
                          Save Feedback
                        </Button>
                      </div>

                      {feedbackStatus && (
                        <p className="text-xs text-emerald-600 font-semibold">{feedbackStatus}</p>
                      )}
                    </div>

                    {/* Receipt Previews */}
                    {drawerExpense.receiptUrls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Receipt Evidence ({drawerExpense.receiptUrls.length})
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {drawerExpense.receiptUrls.map((url, idx) => (
                            <div key={idx} className="rounded-md border border-border bg-muted/10 p-2">
                              {isPreviewableImage(url) ? (
                                <img
                                  src={url}
                                  alt={`Receipt ${idx + 1}`}
                                  className="h-32 w-full rounded object-cover border border-border"
                                />
                              ) : (
                                <div className="flex h-32 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
                                  Document Attached
                                </div>
                              )}
                              <button
                                type="button"
                                disabled={downloadingReceipt !== null}
                                onClick={() => downloadReceipt(url, idx)}
                                className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                <Download className="h-3 w-3" /> Download Receipt
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Drawer Footer Actions */}
                <div className="border-t border-border bg-card px-5 py-3 flex items-center justify-end gap-2">
                  <Button
                    variant="default"
                    size="xs"
                    disabled={actionInProgress === drawerExpense.id}
                    onClick={async () => {
                      await handleApprove(drawerExpense.id);
                      setReviewDrawerOpen(false);
                    }}
                    className="font-bold bg-primary text-primary-foreground"
                  >
                    {actionInProgress === drawerExpense.id && (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    )}
                    Approve Claim
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={actionInProgress === drawerExpense.id}
                    onClick={() => {
                      setSelectedExpense(drawerExpense);
                      setReviewDrawerOpen(false);
                      setShowRejectDialog(true);
                    }}
                    className="font-bold"
                  >
                    Reject Claim
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Expense Claim</DialogTitle>
              <DialogDescription>
                Provide an audit justification for rejecting this transaction.
              </DialogDescription>
            </DialogHeader>

            {selectedExpense && (
              <div className="space-y-3 pt-2">
                <div className="p-2.5 rounded-md bg-muted/30 border border-border text-xs">
                  <p className="font-semibold text-foreground">
                    {selectedExpense.merchant} • {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedExpense.employeeEmail}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Rejection Reason *
                  </label>
                  <Textarea
                    placeholder="State reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setShowRejectDialog(false);
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={handleReject}
                    disabled={!rejectReason.trim()}
                    className="font-bold"
                  >
                    Confirm Rejection
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

export default ManagerPending;
