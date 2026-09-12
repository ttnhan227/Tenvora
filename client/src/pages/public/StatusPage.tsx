import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Database, RefreshCw, Server } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import apiClient from "@/services/apiClient";

type HealthState = "checking" | "online" | "offline";

export default function StatusPage() {
  const [apiState, setApiState] = useState<HealthState>("checking");
  const [databaseState, setDatabaseState] = useState<HealthState>("checking");
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setApiState("checking");
    setDatabaseState("checking");
    try {
      const response = await apiClient.get("/health/ready");
      setApiState(response.data?.status === "ready" ? "online" : "offline");
      setDatabaseState(response.data?.database === "connected" ? "online" : "offline");
    } catch {
      setApiState("offline");
      setDatabaseState("offline");
    } finally {
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const interval = window.setInterval(() => void checkHealth(), 30_000);
    return () => window.clearInterval(interval);
  }, [checkHealth]);

  const allOnline = apiState === "online" && databaseState === "online";
  const checking = apiState === "checking" || databaseState === "checking";
  const title = checking ? "Checking the running services" : allOnline ? "Workspace services are reachable" : "A workspace service is unavailable";
  const StatusIcon = checking ? Activity : allOnline ? CheckCircle2 : AlertTriangle;

  const services = [
    { name: "Tenvora API", description: "Handles authentication and workspace operations.", state: apiState, icon: Server },
    { name: "Workspace database", description: "Stores tenant, invoice, client, and planning records.", state: databaseState, icon: Database },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <section className={`rounded-3xl border p-7 text-center sm:p-9 ${allOnline ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20"}`}>
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${allOnline ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
              <StatusIcon className={`h-7 w-7 ${checking ? "animate-pulse" : ""}`} />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This result comes from the current API readiness endpoint. It is not a historical uptime or SLA claim.
            </p>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <p className="text-xs font-mono text-muted-foreground" aria-live="polite">
                {lastCheck ? `Last checked ${lastCheck.toLocaleTimeString()}` : "Running first check…"}
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => void checkHealth()} disabled={checking} className="rounded-xl">
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} /> Check again
              </Button>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <Card key={service.name} className="rounded-2xl border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <service.icon className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${service.state === "online" ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : service.state === "checking" ? "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"}`}>
                      {service.state}
                    </span>
                  </div>
                  <h2 className="mt-5 font-bold text-foreground">{service.name}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
            <strong className="text-foreground">What this page verifies:</strong> the API can answer a live readiness request and reach its database. Browser availability, third-party AI providers, email delivery, bank connections, payments, and tax filing are not claimed or monitored here.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
