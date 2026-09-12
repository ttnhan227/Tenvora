import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/apiClient";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  FileUp,
  Moon,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Zap,
} from "lucide-react";

export default function SystemOperations() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [liveness, setLiveness] = useState<{ status: string; timestamp: string } | null>(null);
  const [readiness, setReadiness] = useState<{ status: string; database: string; timestamp: string } | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState("");

  async function runDiagnostics() {
    setDiagnosticsLoading(true);
    setDiagnosticsError("");
    const start = performance.now();
    try {
      const [liveRes, readyRes] = await Promise.all([
        apiClient.get("/health/live"),
        apiClient.get("/health/ready"),
      ]);
      setLatencyMs(Math.round(performance.now() - start));
      setLiveness(liveRes.data);
      setReadiness(readyRes.data);
    } catch (error) {
      console.error("Health check error", error);
      setLiveness(null);
      setReadiness(null);
      setLatencyMs(null);
      setDiagnosticsError("System health could not be verified. Try the check again.");
    } finally {
      setDiagnosticsLoading(false);
    }
  }

  useEffect(() => {
    void runDiagnostics();
  }, []);

  const initials = user?.companyName
    ? user.companyName.split(" ").map((name) => name[0]).slice(0, 2).join("").toUpperCase()
    : "ME";

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6 pb-12">
        <header>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <SlidersHorizontal size={12} /> Workspace
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Settings &amp; Preferences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your workspace identity, appearance, privacy boundary, and system status.
          </p>
        </header>

        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-blue-400 font-mono text-lg font-black text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-foreground">{user?.companyName || "Freelancer Workspace"}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={11} /> Active
                </span>
              </div>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{user?.email || "freelancer@tenvora.internal"}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Freelancer workspace · {user?.preferredCurrency || "USD"} reporting currency
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <h2 className="text-base font-bold text-foreground">Appearance</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Choose the visual theme for this browser.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
                className="gap-1.5 text-xs font-semibold"
              >
                <Sun size={14} /> Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
                className="gap-1.5 text-xs font-semibold"
              >
                <Moon size={14} /> Dark
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileUp size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Data &amp; privacy</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Statement CSV files are parsed locally in your browser. Tenvora does not request bank credentials, connect to a bank, or move funds.
                </p>
              </div>
            </div>
          </section>
        </div>

        <details className="group rounded-2xl border border-border/60 bg-card/50 p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground">
            <span className="flex items-center gap-2"><Activity size={14} /> System diagnostics</span>
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          </summary>

          <div className="mt-5 space-y-4 border-t border-border/60 pt-5 text-xs">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-bold text-foreground">Live service checks</h3>
                <p className="text-[11px] text-muted-foreground">Results come from the application and database health endpoints.</p>
              </div>
              <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={diagnosticsLoading} className="h-8 gap-1.5 text-xs">
                <RefreshCw className={`h-3 w-3 ${diagnosticsLoading ? "animate-spin" : ""}`} />
                Check again
              </Button>
            </div>

            {diagnosticsError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">{diagnosticsError}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Application</p>
                <p className="mt-1 flex items-center gap-1.5 font-bold text-foreground">
                  <span className={`h-2 w-2 rounded-full ${diagnosticsLoading ? "bg-amber-500" : liveness?.status === "healthy" ? "bg-emerald-500" : "bg-destructive"}`} />
                  {diagnosticsLoading ? "Checking…" : liveness?.status === "healthy" ? "Healthy" : "Unavailable"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Database</p>
                <p className="mt-1 flex items-center gap-1.5 font-bold text-foreground">
                  <span className={`h-2 w-2 rounded-full ${diagnosticsLoading ? "bg-amber-500" : readiness?.database === "connected" ? "bg-emerald-500" : "bg-destructive"}`} />
                  {diagnosticsLoading ? "Checking…" : readiness?.database === "connected" ? "Connected" : "Unavailable"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Round trip</p>
                <p className="mt-1 flex items-center gap-1.5 font-bold text-foreground"><Zap size={13} className="text-primary" />{latencyMs !== null ? `${latencyMs} ms` : "—"}</p>
              </div>
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              Workspace access is tenant-scoped. Rate limits and idempotency protections help prevent accidental duplicate writes.
            </p>
          </div>
        </details>
      </div>
    </DashboardLayout>
  );
}
