import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { managerService, AuditLog } from "@/services/managerService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, AlertCircle, History, ShieldCheck } from "lucide-react";

const parseAuditPayload = (value?: string) => {
  if (!value) return null;
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
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "Approved":
        return <Badge variant="success">Approved</Badge>;
      case "Rejected":
      case "Deleted":
        return <Badge variant="destructive">{action}</Badge>;
      case "Submitted":
        return <Badge variant="warning">Submitted</Badge>;
      case "Created":
      default:
        return <Badge variant="outline">{action}</Badge>;
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

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-4xl mx-auto font-sans">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3 border-b border-border/80 pb-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => navigate(-1)}
            title="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">Audit Trail</h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Tamper-Evident
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Claim ID: {id}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Timeline Log Container */}
        {logs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No Event History Recorded</p>
              <p className="text-xs text-muted-foreground mt-1">
                State transitions for this expense will appear here automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Lifecycle Activity Log</CardTitle>
                <span className="font-mono text-xs text-muted-foreground font-semibold">
                  {logs.length} logged events
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              {logs.map((log, index) => {
                const oldValue = parseAuditPayload(log.oldValue);
                const newValue = parseAuditPayload(log.newValue);

                return (
                  <div key={log.id} className="relative flex gap-3.5 text-xs">
                    {/* Vertical Connector Line */}
                    {index !== logs.length - 1 && (
                      <div className="absolute left-2.5 top-6 bottom-0 w-px bg-border" />
                    )}

                    {/* Timeline Node Icon */}
                    <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>

                    {/* Event Content Body */}
                    <div className="flex-1 space-y-1.5 pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action)}
                          <span className="font-semibold text-foreground">
                            {log.performedBy}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>

                      {log.notes && (
                        <div className="rounded-md border border-border bg-muted/20 p-2.5 text-xs text-foreground">
                          <span className="font-semibold mr-1">Note:</span> {log.notes}
                        </div>
                      )}

                      {/* State Diff Details */}
                      {oldValue && newValue && (
                        <div className="rounded-md border border-border bg-muted/10 p-2.5 space-y-1 font-mono text-[11px]">
                          <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                            Field Transitions
                          </p>
                          {Object.keys(newValue).map((key) => {
                            const oldVal = oldValue[key];
                            const newVal = newValue[key];
                            if (oldVal === newVal) return null;

                            return (
                              <div key={key} className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-foreground capitalize">
                                  {key}:
                                </span>
                                <span className="line-through text-muted-foreground bg-muted px-1 rounded">
                                  {String(oldVal ?? "null")}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-bold text-foreground bg-secondary px-1 rounded">
                                  {String(newVal ?? "null")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AuditTrail;
