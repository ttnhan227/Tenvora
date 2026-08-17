import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { managerService, AuditLog } from "@/services/managerService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, AlertCircle, History } from "lucide-react";

const parseAuditPayload = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const AuditTrail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAuditTrail = async () => {
      if (!id) return;
      const result = await managerService.getAuditTrail(id);
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || "Failed to fetch audit trail");
      }
      setIsLoading(false);
    };

    fetchAuditTrail();
  }, [id]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    if (action === "Approved") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-medium py-0.5 rounded">
          Approved
        </Badge>
      );
    }
    if (action === "Rejected" || action === "Deleted") {
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[9px] font-medium py-0.5 rounded">
          {action}
        </Badge>
      );
    }
    return (
      <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-medium py-0.5 rounded">
        {action}
      </Badge>
    );
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case "Created":
        return "text-primary border-primary/30";
      case "Updated":
        return "text-amber-500 border-amber-500/30";
      case "Submitted":
        return "text-sky-500 border-sky-500/30";
      case "Approved":
        return "text-emerald-500 border-emerald-500/30";
      case "Rejected":
      case "Deleted":
        return "text-red-500 border-red-500/30";
      default:
        return "text-muted-foreground border-border";
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
      <div className="space-y-6 max-w-4xl font-sans">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/manager/pending")} 
            className="h-9 w-9 rounded-lg border-border text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
            <p className="text-xs text-muted-foreground">
              Immutable chain-of-custody log for claim ID: <span className="font-mono text-foreground font-medium">{id}</span>
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {/* Timeline */}
        {logs.length === 0 ? (
          <Card className="rounded-xl border border-border bg-card overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Audit Logs Found</p>
              <p className="text-xs text-muted-foreground mt-1">This expense has not triggered lifecycle state changes yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl border border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Activity History</CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-mono">{logs.length} recorded events</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {logs.map((log, index) => (
                  <div key={log.id}>
                    {(() => {
                      const oldValue = parseAuditPayload(log.oldValue);
                      const newValue = parseAuditPayload(log.newValue);

                      return (
                        <div className="flex gap-4 items-start text-xs leading-normal">
                          {/* Timeline indicator */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${getActionColor(log.action)} bg-card`}>
                              <div className="h-2 w-2 rounded-full bg-current" />
                            </div>
                            {index !== logs.length - 1 && (
                              <div className="h-12 w-px bg-border my-1" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pt-0.5">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {getActionBadge(log.action)}
                              <span className="font-semibold text-foreground">
                                {log.performedBy}
                              </span>
                            </div>

                            <p className="text-[10px] text-muted-foreground font-mono">
                              {formatDate(log.timestamp)}
                            </p>

                            {log.notes && (
                              <p className="text-xs mt-2 p-3 rounded-lg bg-muted/40 border border-border text-foreground leading-relaxed">
                                <strong className="text-foreground mr-1">Note:</strong> {log.notes}
                              </p>
                            )}

                            {/* Changes details */}
                            {oldValue && newValue && (
                              <div className="mt-3 space-y-2 text-xs border border-border p-3 rounded-lg bg-muted/20 font-mono">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                  <History className="h-3 w-3 text-muted-foreground" />
                                  Field State Diff
                                </p>
                                {Object.keys(newValue).map((key) => {
                                  const oldVal = oldValue[key];
                                  const newVal = newValue[key];
                                  if (oldVal === newVal) return null;

                                  return (
                                    <div key={key} className="flex gap-2 flex-wrap items-center">
                                      <span className="font-semibold text-foreground capitalize">
                                        {key}:
                                      </span>
                                      <div className="space-x-1.5">
                                        <span className="line-through text-muted-foreground bg-red-500/5 px-1 rounded border border-red-500/10">
                                          {typeof oldVal === "object"
                                            ? JSON.stringify(oldVal)
                                            : String(oldVal)}
                                        </span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="font-semibold text-foreground bg-emerald-500/5 px-1 rounded border border-emerald-500/10">
                                          {typeof newVal === "object"
                                            ? JSON.stringify(newVal)
                                            : String(newVal)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {index !== logs.length - 1 && <Separator className="my-6 border-border" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back navigation */}
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate("/manager/pending")} 
            variant="outline"
            className="rounded-lg px-4 text-xs font-medium border-border h-9"
          >
            Back to Review Queue
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditTrail;
