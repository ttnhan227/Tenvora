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
import { AlertCircle, CheckCircle, XCircle, Loader2, Eye, FileText, History, ShieldAlert, Download } from "lucide-react";

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

  const getRiskBadge = (level: string) => {
    if (level === "High") {
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/10 text-[10px] font-bold py-0.5 rounded">
          High
        </Badge>
      );
    }
    if (level === "Medium") {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 text-[10px] font-medium py-0.5 rounded">
          Medium
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 text-[10px] font-medium py-0.5 rounded">
        Low
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
      setFeedbackStatus("Feedback saved. Future evaluations will incorporate this correction.");
      setFeedbackNotes("");
    } else {
      setError(result.error || "Failed to submit review feedback");
    }
  };

  const recommendationVariant = (rec: string): "outline" | "secondary" | "destructive" | "default" => {
    if (rec === "Escalate") return "destructive";
    if (rec === "Needs review") return "secondary";
    return "default";
  };

  const isPreviewableImage = (url: string) => {
    const normalized = url.toLowerCase();
    return normalized.startsWith("data:image/") || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(normalized);
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
      <div className="space-y-6 font-sans">
        {/* Header */}
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
            <p className="text-xs text-muted-foreground">
              Risk-ranked expense claims awaiting manager approval or escalation.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Queue Total</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-foreground font-mono">{filteredExpenses.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Claims pending review</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">High Risk</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-red-500 font-mono">{highRiskCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Score &gt; 75% or anomalies</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escalations</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-amber-500 font-mono">{escalateCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Requires senior review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="grid gap-3 md:grid-cols-2 bg-card border border-border p-4 rounded-xl">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Risk Rating Filter</label>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg h-9">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                <SelectItem value={ALL_RISKS}>All Risk Levels</SelectItem>
                <SelectItem value="Low">Low Risk</SelectItem>
                <SelectItem value="Medium">Medium Risk</SelectItem>
                <SelectItem value="High">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Recommendation Filter</label>
            <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
              <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-lg h-9">
                <SelectValue placeholder="Filter by recommendation" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                <SelectItem value={ALL_RECOMMENDATIONS}>All Recommendations</SelectItem>
                <SelectItem value="Approve with normal review">Approve with normal review</SelectItem>
                <SelectItem value="Needs review">Needs review</SelectItem>
                <SelectItem value="Escalate">Escalate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table list */}
        <Card className="rounded-xl border border-border bg-card overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/10 px-6 py-4">
            <CardTitle className="text-sm font-bold text-foreground">Pending Approvals</CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-mono">
              {filteredExpenses.length === 0
                ? "No pending expenses"
                : `${filteredExpenses.length} claim(s) awaiting action`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500/50 mb-3" />
                <p className="text-sm font-semibold text-foreground">Review Queue is Clear</p>
                <p className="text-xs text-muted-foreground mt-1">All submitted expenses have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs text-left">
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/30 uppercase tracking-wider text-[10px] text-muted-foreground">
                      <TableHead className="py-3 px-4 font-semibold">Priority</TableHead>
                      <TableHead className="py-3 px-4 font-semibold">Employee</TableHead>
                      <TableHead className="py-3 px-4 font-semibold">Merchant / Date</TableHead>
                      <TableHead className="py-3 px-4 font-semibold">Amount</TableHead>
                      <TableHead className="py-3 px-4 font-semibold">Risk Rating</TableHead>
                      <TableHead className="py-3 px-4 font-semibold">AI Recommendation</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className={`border-b border-border hover:bg-muted/10 transition ${expense.riskAssessment.riskLevel === "High" ? "bg-red-500/[0.01]" : ""}`}>
                        <TableCell className="py-3 px-4 font-mono font-bold">
                          <Badge variant="outline" className="border-border font-mono text-[9px]">#{expense.reviewPriority}</Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 font-medium text-foreground">
                          {expense.employeeEmail}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <p className="font-semibold text-foreground">{expense.merchant}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{expense.category} · {formatDate(expense.date)}</p>
                        </TableCell>
                        <TableCell className="py-3 px-4 font-bold text-foreground font-mono">
                          {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getRiskBadge(expense.riskAssessment.riskLevel)}
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {expense.riskAssessment.riskScore}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{expense.reviewAssistant.recommendation}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">
                              {expense.riskAssessment.riskReasons[0] || "Passes policy checks."}
                            </p>
                            {expense.triggeredRuleCount > 0 && (
                              <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 text-[9px] font-semibold py-0.5 rounded font-mono">
                                {expense.triggeredRuleCount} Policy Breaches
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Review details"
                              onClick={() => openReviewDrawer(expense)}
                              className="rounded-md hover:bg-muted text-muted-foreground hover:text-foreground h-7 w-7"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => handleApprove(expense.id)}
                              disabled={actionInProgress === expense.id}
                              title="Approve Claim"
                              className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground h-7 w-7"
                            >
                              {actionInProgress === expense.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowRejectDialog(true);
                              }}
                              disabled={actionInProgress === expense.id}
                              title="Reject Claim"
                              className="rounded-md text-destructive hover:bg-destructive/10 h-7 w-7"
                            >
                              {actionInProgress === expense.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                            </Button>
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

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="rounded-xl border border-border bg-card shadow-lg max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Reject Claim</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Enter the reason for rejection. This note will be sent to the employee.
              </DialogDescription>
            </DialogHeader>

            {selectedExpense && (
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded-lg bg-muted/40 text-xs border border-border">
                  <p className="font-semibold text-foreground">
                    {selectedExpense.merchant} · {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{selectedExpense.employeeEmail}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rejection Reason *</label>
                  <Textarea
                    placeholder="Provide specific feedback on why this claim was rejected..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                    className="bg-background border-border text-foreground text-xs rounded-lg min-h-[100px]"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectDialog(false);
                      setRejectReason("");
                    }}
                    className="rounded-lg px-4 text-xs font-medium h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectReason.trim()}
                    className="rounded-lg px-4 text-xs font-semibold h-8"
                  >
                    Reject Claim
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Review Sheet/Drawer */}
        <Sheet open={reviewDrawerOpen} onOpenChange={setReviewDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0 border-l border-border bg-card">
            {drawerExpense && (
              <>
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-border bg-muted/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <SheetTitle className="text-base font-bold text-foreground">{drawerExpense.merchant}</SheetTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{drawerExpense.employeeEmail} · {drawerExpense.category}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getRiskBadge(drawerExpense.riskAssessment.riskLevel)}
                      <span className="text-xs font-mono font-semibold text-foreground">{drawerExpense.riskAssessment.riskScore}% risk</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Badge variant={recommendationVariant(drawerExpense.reviewAssistant.recommendation)} className="text-[10px] rounded px-2 py-0.5">
                      {drawerExpense.reviewAssistant.recommendation}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] rounded px-2 py-0.5 border-border">
                      Confidence: {drawerExpense.reviewAssistant.confidence}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] rounded px-2 py-0.5 border-border">
                      Priority #{drawerExpense.reviewPriority}
                    </Badge>
                  </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-6 py-6 text-xs leading-relaxed">
                    
                    {/* Summary */}
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">AI Recommendation Summary</p>
                      <p className="text-foreground leading-relaxed">{drawerExpense.reviewAssistant.summary}</p>
                    </div>

                    {/* Amount Details */}
                    <div className="grid grid-cols-2 gap-4 text-xs bg-muted/20 border border-border p-4 rounded-lg">
                      <div>
                        <p className="text-muted-foreground uppercase font-bold tracking-wider text-[9px]">Requested Amount</p>
                        <p className="font-bold text-base text-foreground font-mono mt-0.5">{formatCurrency(drawerExpense.amount, drawerExpense.currency)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase font-bold tracking-wider text-[9px]">Transaction Date</p>
                        <p className="font-semibold text-foreground font-mono mt-0.5">{formatDate(drawerExpense.date)}</p>
                      </div>
                      {drawerExpense.description && (
                        <div className="col-span-2 border-t border-border pt-2 mt-1">
                          <p className="text-muted-foreground uppercase font-bold tracking-wider text-[9px]">Business Purpose</p>
                          <p className="font-medium text-foreground mt-0.5">{drawerExpense.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Policy triggers */}
                    {drawerExpense.riskAssessment.policyTriggers.length > 0 && (
                      <div className="border border-red-500/20 bg-red-500/[0.02] p-4 rounded-lg space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4" />
                          Triggered Policy Rules
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {drawerExpense.riskAssessment.policyTriggers.map((trigger, idx) => (
                            <Badge key={idx} variant="destructive" className="text-[10px] px-2 py-0.5 rounded font-medium">
                              {trigger}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Risk reasons */}
                    {drawerExpense.riskAssessment.riskReasons.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evaluation Notes</p>
                        <ul className="space-y-1.5 text-xs text-foreground bg-card border border-border p-4 rounded-lg">
                          {drawerExpense.riskAssessment.riskReasons.map((reason, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Learning Feedback */}
                    <div className="space-y-3 bg-muted/20 border border-border p-4 rounded-lg">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">Reviewer Feedback & Classification Override</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Submit corrections to refine future policy evaluation accuracy.</p>
                      </div>
                      
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-muted-foreground uppercase">Corrected Risk Level</label>
                          <Select value={feedbackRiskLevel} onValueChange={setFeedbackRiskLevel}>
                            <SelectTrigger className="bg-background border-border text-xs rounded-lg h-8">
                              <SelectValue placeholder="Corrected risk level" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                              <SelectItem value="Low">Low Risk</SelectItem>
                              <SelectItem value="Medium">Medium Risk</SelectItem>
                              <SelectItem value="High">High Risk</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                          <Checkbox
                            checked={feedbackFalsePositive}
                            onCheckedChange={(checked) => setFeedbackFalsePositive(checked === true)}
                          />
                          <span>Mark rule trigger as false positive</span>
                        </label>
                        
                        <Textarea
                          placeholder="Correction notes or context..."
                          value={feedbackNotes}
                          onChange={(e) => setFeedbackNotes(e.target.value)}
                          rows={2}
                          className="bg-background border-border text-xs rounded-lg min-h-[60px]"
                        />
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={handleSubmitFeedback}
                          className="rounded-lg px-3 border-border text-xs h-7"
                        >
                          Save Feedback
                        </Button>
                      </div>
                      
                      {feedbackStatus && <p className="text-xs text-emerald-600 font-semibold mt-2">{feedbackStatus}</p>}
                    </div>

                    {/* Related expenses */}
                    {drawerExpense.reviewAssistant.relatedExpenses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Historical Vendor Context ({drawerExpense.reviewAssistant.relatedExpenses.length})</p>
                        <div className="space-y-2">
                          {drawerExpense.reviewAssistant.relatedExpenses.map((related) => (
                            <div key={related.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
                              <div>
                                <p className="font-semibold text-foreground">{related.merchant}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{related.employeeEmail} · {related.relationship}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-foreground font-mono">{formatCurrency(related.amount, related.currency)}</p>
                                <Badge variant="outline" className="text-[9px] uppercase font-mono px-1 rounded-sm mt-0.5">{related.status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Receipts */}
                    {drawerExpense.receiptUrls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attached Receipts ({drawerExpense.receiptUrls.length})</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {drawerExpense.receiptUrls.map((url, idx) => (
                            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-2 overflow-hidden">
                              {isPreviewableImage(url) ? (
                                <img
                                  src={url}
                                  alt={`Receipt ${idx + 1}`}
                                  className="h-40 w-full rounded-md object-cover border border-border"
                                />
                              ) : (
                                <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground">
                                  No Preview Available
                                </div>
                              )}
                              <button
                                type="button"
                                disabled={downloadingReceipt !== null}
                                onClick={() => downloadReceipt(url, idx)}
                                className="mt-2 flex w-full items-center justify-center gap-1.5 truncate text-center text-xs font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                              >
                                {downloadingReceipt === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                {downloadingReceipt === idx ? "Preparing file…" : `Download receipt ${idx + 1}`}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audit trail */}
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Audit History</p>
                      {isLoadingAudit ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading logs…
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No recent history.</p>
                      ) : (
                        <div className="space-y-2 text-[10px]">
                          {auditLogs.slice(-3).reverse().map((log) => (
                            <div key={log.id} className="flex gap-3 text-xs bg-muted/30 p-2.5 rounded-lg border border-border">
                              <Badge variant="outline" className="text-[9px] shrink-0 h-fit rounded">{log.action}</Badge>
                              <div>
                                <p className="text-foreground font-semibold">{log.performedBy}</p>
                                <p className="text-muted-foreground text-[9px] mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                                {log.notes && <p className="text-foreground mt-1 text-xs bg-card p-1.5 rounded border border-border">{log.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Drawer footer actions */}
                <div className="border-t border-border bg-muted/10 px-6 py-3 flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={actionInProgress === drawerExpense.id}
                    onClick={async () => {
                      await handleApprove(drawerExpense.id);
                      setReviewDrawerOpen(false);
                    }}
                    className="rounded-lg px-4 text-xs font-semibold bg-primary hover:bg-primary/90 h-8"
                  >
                    {actionInProgress === drawerExpense.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Approve Claim
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={actionInProgress === drawerExpense.id}
                    onClick={() => {
                      setSelectedExpense(drawerExpense);
                      setReviewDrawerOpen(false);
                      setShowRejectDialog(true);
                    }}
                    className="rounded-lg px-4 text-xs font-semibold h-8"
                  >
                    Reject Claim
                  </Button>
                  <Button variant="outline" size="sm" asChild className="rounded-lg px-3 text-xs border-border h-8">
                    <Link to={`/expenses/${drawerExpense.id}`}>
                      <FileText className="mr-1 h-3.5 w-3.5" />
                      View Claim
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="rounded-lg px-3 text-xs h-8">
                    <Link to={`/manager/audit/${drawerExpense.id}`}>
                      <History className="mr-1 h-3.5 w-3.5" />
                      Audit Trail
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default ManagerPending;
