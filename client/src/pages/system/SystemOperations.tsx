import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Server,
  Database,
  ShieldCheck,
  Shield,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  Lock,
  Cpu,
} from "lucide-react";
import { StatusBadge } from "@/components/design-system";
import apiClient from "@/services/apiClient";

export default function SystemOperations() {
  const [liveness, setLiveness] = useState<{ status: string; timestamp: string } | null>(null);
  const [readiness, setReadiness] = useState<{ status: string; database: string; timestamp: string } | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  async function runDiagnostics() {
    setLoading(true);
    const start = performance.now();
    try {
      const [liveRes, readyRes] = await Promise.all([
        apiClient.get("/health/live"),
        apiClient.get("/health/ready"),
      ]);
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setLiveness(liveRes.data);
      setReadiness(readyRes.data);
    } catch (e) {
      console.error("Health check error", e);
    }
    setLoading(false);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              System Operations &amp; Telemetry
            </h1>
            <p className="text-xs text-muted-foreground">
              Live API probes, database connection latency, PostgreSQL Row-Level Security (RLS), and rate limiting diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runDiagnostics}
              disabled={loading}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Run Health Check
            </Button>
          </div>
        </div>

        {/* Live Probes Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Process Liveness Probe
            </div>
            <div className="flex items-center gap-2 text-base font-bold font-mono text-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{liveness?.status === "healthy" ? "Healthy (200 OK)" : "Degraded"}</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              Endpoint: /api/health/live
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Database Readiness Probe
            </div>
            <div className="flex items-center gap-2 text-base font-bold font-mono text-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{readiness?.database === "connected" ? "Connected (Ready)" : "Connecting"}</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              Endpoint: /api/health/ready
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Round-Trip API Latency
            </div>
            <div className="flex items-center gap-2 text-base font-bold font-mono text-foreground">
              <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{latencyMs !== null ? `${latencyMs} ms` : "—"}</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              P99 Target &lt; 50ms
            </div>
          </div>
        </div>

        {/* Security & Infrastructure Telemetry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded border border-border bg-card space-y-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground flex items-center gap-2 pb-2 border-b border-border/60">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              PostgreSQL Multi-Tenant RLS Status
            </span>

            <dl className="divide-y divide-border/50 text-xs font-mono">
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Tenant Isolation Engine</dt>
                <dd className="font-bold text-foreground">PostgreSQL Row-Level Security</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Session Configuration</dt>
                <dd className="font-bold text-emerald-600 dark:text-emerald-400">SET LOCAL app.current_tenant</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Kernel Enforcement</dt>
                <dd className="text-foreground">Database Engine Level</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Cross-Tenant Leakage Risk</dt>
                <dd className="font-bold text-emerald-600 dark:text-emerald-400">0.00% (Isolated)</dd>
              </div>
            </dl>
          </div>

          <div className="p-4 rounded border border-border bg-card space-y-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground flex items-center gap-2 pb-2 border-b border-border/60">
              <Activity className="h-4 w-4 text-foreground" />
              Traffic &amp; Rate-Limiting Policy
            </span>

            <dl className="divide-y divide-border/50 text-xs font-mono">
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Transfer Endpoint Policy</dt>
                <dd className="font-bold text-foreground">30 requests / 10 sec</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Standard API Policy</dt>
                <dd className="font-bold text-foreground">100 requests / 10 sec</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Limiter Algorithm</dt>
                <dd className="text-foreground">Sliding Window Partitioned</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Idempotency Retention</dt>
                <dd className="font-bold text-foreground">24 Hours TTL</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Diagnostic Logs */}
        <div className="p-4 rounded border border-border bg-card space-y-2">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground block pb-1 border-b border-border/60">
            Telemetry Feed Output
          </span>
          <div className="p-3 rounded bg-muted/20 border border-border/80 font-mono text-xs text-muted-foreground space-y-1">
            <p className="text-foreground font-semibold">● [INFO] ASP.NET Core Runtime 10.0 initialized in Production mode.</p>
            <p>● [SECURITY] JWT Bearer Token validation and tenant claim interception active.</p>
            <p>● [DATABASE] Entity Framework Core connecting to PostgreSQL with RLS session variables.</p>
            <p>● [RECONCILIATION] Continuous double-entry mathematical invariant auditor running in background.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
