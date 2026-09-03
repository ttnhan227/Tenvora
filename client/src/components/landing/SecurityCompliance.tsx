import { ShieldCheck, Lock, Database, FileText, CheckCircle2, KeyRound, Maximize2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SecurityCompliance() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section id="security" className="py-24 border-t border-border/60 bg-muted/20 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
            <ShieldCheck className="h-3.5 w-3.5" />
            ENTERPRISE SECURITY &amp; COMPLIANCE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Defense-in-Depth for Enterprise Money Movement
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            From database kernel row-level security to deterministic concurrency controls, Tenvora guarantees strict multi-tenant boundaries.
          </p>
        </div>

        {/* Big Visual Architecture Banner */}
        <div className="mb-12 relative rounded-3xl border border-border/80 bg-card p-3 shadow-2xl overflow-hidden group">
          <div
            onClick={() => setModalOpen(true)}
            className="relative rounded-2xl overflow-hidden aspect-[21/9] max-h-[420px] bg-slate-950 cursor-pointer"
          >
            <img
              src="/tenvora-enterprise-security.jpg"
              alt="PostgreSQL RLS Kernel & Cryptographic Ledger Security"
              className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent pointer-events-none" />

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="bg-background/90 backdrop-blur-md p-4 rounded-xl border border-border/90 max-w-lg">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Infrastructure Architecture
                </span>
                <h3 className="text-sm font-bold text-foreground mt-0.5">
                  PostgreSQL Row-Level Security (RLS) &amp; Deterministic Concurrency Locks
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tenant isolation enforced at database storage layer with cryptographically verifiable audit logs.
                </p>
              </div>

              <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/80 text-[11px] font-mono font-semibold text-muted-foreground flex items-center gap-1.5 self-start sm:self-auto">
                <Maximize2 className="h-3.5 w-3.5 text-emerald-500" />
                Inspect Security Topology
              </div>
            </div>
          </div>
        </div>

        {/* Security Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Database className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-foreground">PostgreSQL Row-Level Security (RLS)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Security policies are applied directly in the SQL engine using <code className="text-emerald-500 font-mono bg-muted px-1.5 py-0.5 rounded">current_setting('app.current_tenant_id')</code>.
              </p>
            </div>
            <ul className="space-y-2 pt-1 text-xs text-foreground/80 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Zero cross-tenant leakage vectors
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Automatic schema-level enforcement
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-foreground">Deadlock-Free Concurrency Locks</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Multi-account transactions sort target account IDs deterministically before acquiring <code className="text-cyan-500 font-mono bg-muted px-1.5 py-0.5 rounded">SELECT ... FOR UPDATE</code> locks.
              </p>
            </div>
            <ul className="space-y-2 pt-1 text-xs text-foreground/80 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
                Proven AB-BA deadlock elimination
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
                Zero overdraft balance protection
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <FileText className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-foreground">Immutable Audit Trails</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every authorization event, transfer initiation, user permission change, and reconciliation scan generates an append-only audit record.
              </p>
            </div>
            <ul className="space-y-2 pt-1 text-xs text-foreground/80 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                X-Correlation-ID request tracing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                Append-only non-repudiable logs
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* High-Res Security Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[850px] p-2 bg-card border border-border">
          <DialogHeader className="p-3 pb-1 text-left">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              PostgreSQL Row-Level Security (RLS) &amp; Isolation Architecture
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl overflow-hidden bg-slate-950 border border-border">
            <img src="/tenvora-enterprise-security.jpg" alt="Security Architecture" className="w-full h-auto max-h-[75vh] object-contain mx-auto" />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
