import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  Download,
  Trash2,
  UserSearch,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCheck,
  Hash,
} from "lucide-react";
import {
  complianceService,
  SoxAuditTrail,
  Soc2ComplianceReport,
  GdprUserDataExport,
  GdprDeletionResult,
} from "@/services/analyticsService";

// ── SOX Panel ───────────────────────────────────────────────────────────────
const SoxPanel = () => {
  const [trail, setTrail] = useState<SoxAuditTrail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchTrail = async () => {
    setIsLoading(true);
    setError("");
    const result = await complianceService.getSoxAuditTrail(from || undefined, to || undefined);
    if (result.success && result.data) {
      setTrail(result.data);
    } else {
      setError(result.error || "Failed to load SOX audit trail");
    }
    setIsLoading(false);
  };

  const downloadJson = () => {
    if (!trail) return;
    const blob = new Blob([JSON.stringify(trail, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sox-audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      <Card>
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SOX 404 Tamper-Evident Ledger</CardTitle>
              <CardDescription>
                Cryptographically linked SHA-256 hash chains for forensic validation
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">
              SHA-256 Chain
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="sox-from" className="text-xs font-semibold text-muted-foreground">
                From Date
              </Label>
              <Input
                id="sox-from"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-48 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sox-to" className="text-xs font-semibold text-muted-foreground">
                To Date
              </Label>
              <Input
                id="sox-to"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-48 font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchTrail}
                disabled={isLoading}
                variant="default"
                size="xs"
                className="font-bold gap-1.5"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3 w-3" />
                )}
                Query SOX Ledger
              </Button>
              {trail && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={downloadJson}
                  className="gap-1.5 font-medium"
                >
                  <Download className="h-3 w-3" /> Export JSON
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {trail && (
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>{trail.totalCount} Hash-Verified Entries</CardTitle>
                <CardDescription className="font-mono text-[10px] break-all max-w-xl mt-0.5">
                  Chain Root Hash: {trail.exportHash}
                </CardDescription>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {new Date(trail.exportedAt).toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {trail.entries.map((entry) => (
                <div key={entry.id} className="rounded-md border border-border bg-card p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          entry.action === "Approved"
                            ? "success"
                            : entry.action === "Rejected"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {entry.action}
                      </Badge>
                      <span className="font-semibold text-foreground">{entry.performedBy}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {entry.notes && (
                    <p className="text-muted-foreground bg-muted/20 p-2 rounded text-xs">
                      {entry.notes}
                    </p>
                  )}

                  <p className="font-mono text-[10px] text-muted-foreground break-all bg-muted/10 px-2 py-1 rounded border border-border/40">
                    SHA-256: {entry.integrityHash}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ── GDPR Panel ──────────────────────────────────────────────────────────────
const GdprPanel = () => {
  const [userId, setUserId] = useState("");
  const [exportData, setExportData] = useState<GdprUserDataExport | null>(null);
  const [deletionResult, setDeletionResult] = useState<GdprDeletionResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleExport = async () => {
    if (!userId.trim()) return;
    setIsExporting(true);
    setError("");
    setExportData(null);
    const result = await complianceService.exportUserData(userId.trim());
    if (result.success && result.data) {
      setExportData(result.data);
    } else {
      setError(result.error || "Failed to export user personal data");
    }
    setIsExporting(false);
  };

  const downloadExport = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gdpr-export-${exportData.userId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!userId.trim() || !deleteConfirm) return;
    setIsDeleting(true);
    setError("");
    const result = await complianceService.deleteUserData(userId.trim());
    if (result.success && result.data) {
      setDeletionResult(result.data);
      setExportData(null);
    } else {
      setError(result.error || "Failed to anonymize user data");
    }
    setIsDeleting(false);
    setDeleteConfirm(false);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      <Card>
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle>GDPR Privacy & Data Subject Request (DSR)</CardTitle>
          <CardDescription>
            Art. 15 Right of Access (Data Export) and Art. 17 Right to Erasure (PII Anonymization)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[240px]">
              <Label htmlFor="gdpr-userid" className="text-xs font-semibold text-muted-foreground">
                User Identifier (GUID / ID)
              </Label>
              <Input
                id="gdpr-userid"
                placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setDeleteConfirm(false);
                  setDeletionResult(null);
                }}
                className="font-mono text-xs"
              />
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting || !userId.trim()}
              variant="default"
              size="xs"
              className="gap-1.5 font-bold"
            >
              {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserSearch className="h-3 w-3" />}
              Fetch Subject Data
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {exportData && (
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>{exportData.email}</CardTitle>
                <CardDescription>
                  Role: <span className="font-bold text-foreground font-mono">{exportData.role}</span> • {exportData.expenses.length} claims • {exportData.auditActions.length} audit logs
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="xs" onClick={downloadExport} className="gap-1.5">
                  <Download className="h-3 w-3" /> Download JSON
                </Button>
                {!deleteConfirm ? (
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => setDeleteConfirm(true)}
                    className="gap-1.5 font-bold"
                  >
                    <Trash2 className="h-3 w-3" /> Request Erasure
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 border border-destructive/40 bg-destructive/5 p-1 rounded">
                    <span className="font-bold text-destructive text-[11px]">Confirm PII deletion?</span>
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Erase PII"}
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setDeleteConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-2 sm:grid-cols-2 bg-muted/20 border border-border p-3 rounded text-xs font-mono">
              <div>
                <span className="text-muted-foreground">User ID:</span> {exportData.userId}
              </div>
              <div>
                <span className="text-muted-foreground">Account Status:</span> {exportData.isActive ? "Active" : "Suspended"}
              </div>
              <div>
                <span className="text-muted-foreground">Preferred Currency:</span> {exportData.preferredCurrency}
              </div>
              <div>
                <span className="text-muted-foreground">Generated:</span> {new Date(exportData.exportedAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {deletionResult && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertDescription className="text-xs">
            <strong>Erasure Completed:</strong> {deletionResult.message} ({deletionResult.expensesAnonymized} claims anonymized, {deletionResult.auditLogsRetained} audit logs retained for statutory compliance).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// ── SOC 2 Panel ─────────────────────────────────────────────────────────────
const Soc2Panel = () => {
  const [report, setReport] = useState<Soc2ComplianceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    setIsLoading(true);
    setError("");
    const result = await complianceService.getSoc2Report();
    if (result.success && result.data) {
      setReport(result.data);
    } else {
      setError(result.error || "Failed to load SOC 2 report");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const categories = report ? [...new Set(report.controls.map((c) => c.category))] : [];

  return (
    <div className="space-y-4 font-sans text-xs">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {report && (
        <>
          {/* Summary Score Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Overall Score
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                {report.complianceScore}%
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Passing Controls
              </p>
              <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {report.passingCount}
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Warnings
              </p>
              <p className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">
                {report.warningCount}
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Failing Controls
              </p>
              <p className="text-2xl font-bold font-mono text-red-700 dark:text-red-400">
                {report.failingCount}
              </p>
            </div>
          </div>

          {/* Categories & Evidence List */}
          {categories.map((cat) => (
            <Card key={cat}>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle>{cat}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {report.controls
                  .filter((c) => c.category === cat)
                  .map((control) => (
                    <div
                      key={control.controlId}
                      className="rounded-md border border-border bg-card p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          {control.controlId} — {control.description}
                        </span>
                        <Badge
                          variant={
                            control.status === "PASS"
                              ? "success"
                              : control.status === "FAIL"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {control.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground bg-muted/20 p-2 rounded">
                        Evidence: {control.evidence}
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

// ── Main Page Component ─────────────────────────────────────────────────────
const ComplianceHub = () => (
  <DashboardLayout>
    <div className="space-y-5 max-w-6xl mx-auto font-sans">
      <div className="border-b border-border/80 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Compliance & Audit Hub</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          SOX 404 cryptographic hash chains, SOC 2 Type II controls, and GDPR Right-to-Erasure compliance.
        </p>
      </div>

      <Tabs defaultValue="soc2" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="soc2" className="gap-1.5 text-xs">
            <FileCheck className="h-3.5 w-3.5" /> SOC 2 Report
          </TabsTrigger>
          <TabsTrigger value="sox" className="gap-1.5 text-xs">
            <Hash className="h-3.5 w-3.5" /> SOX Hash Chain
          </TabsTrigger>
          <TabsTrigger value="gdpr" className="gap-1.5 text-xs">
            <UserSearch className="h-3.5 w-3.5" /> GDPR DSR Tool
          </TabsTrigger>
        </TabsList>

        <TabsContent value="soc2"><Soc2Panel /></TabsContent>
        <TabsContent value="sox"><SoxPanel /></TabsContent>
        <TabsContent value="gdpr"><GdprPanel /></TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default ComplianceHub;
