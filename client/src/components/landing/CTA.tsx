import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Terminal } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-20 border-t border-border/60 bg-muted/10 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="relative rounded-2xl border border-border bg-card p-8 sm:p-12 text-center shadow-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-border bg-muted/40 text-foreground font-mono text-[11px] font-semibold">
            <Terminal className="h-3.5 w-3.5 text-emerald-500" />
            ENTERPRISE DEPLOYMENT READY
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
            Ready to deploy deterministic payment operations?
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Provision a high-throughput tenant workspace in seconds. Test live ledger balances, multi-currency batch settlements, and continuous automated reconciliation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/register">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-lg gap-2 text-xs uppercase tracking-wider font-mono">
                <span>Deploy Developer Sandbox</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="h-11 px-6 rounded-lg border-border bg-card hover:bg-muted font-semibold text-xs font-mono">
                Schedule Architecture Briefing
              </Button>
            </Link>
          </div>

          <div className="pt-6 border-t border-border/60 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Zero Production Overdrafts
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              PostgreSQL Native Isolation
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Continuous Discrepancy Scans
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
