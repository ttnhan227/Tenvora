import { ArrowRight, BadgeCheck, BarChart3, BrainCircuit, FileCheck2, ReceiptText, ShieldAlert, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

const workflow = [
  { icon: ReceiptText, label: "Capture", detail: "OCR extraction and structured ledger entry" },
  { icon: BrainCircuit, label: "Assess", detail: "Explainable scoring and duplicate prevention" },
  { icon: ShieldAlert, label: "Control", detail: "Category limits and automated policy gates" },
  { icon: BadgeCheck, label: "Decide", detail: "Priority queue with AI review recommendations" },
  { icon: FileCheck2, label: "Evidence", detail: "Immutable SHA-256 logs and accounting sync" },
];

const workspaces = [
  {
    role: "Employee",
    title: "Fast Claim Ingestion",
    description: "Scan receipts, verify auto-extracted line items, edit via spreadsheet ledger, and submit claims seamlessly.",
    metric: "Instant OCR extraction",
  },
  {
    role: "Finance Manager",
    title: "Risk-Ranked Approval Queue",
    description: "Review transactions with transparent policy violation pills, itemized evidence, and one-click approvals.",
    metric: "48h SLA turnaround",
  },
  {
    role: "Organization Owner",
    title: "Governance & Compliance",
    description: "Configure policy limits, auto-approval thresholds, team roles, SOX audit trails, and QuickBooks/Xero exports.",
    metric: "SOX • SOC 2 • GDPR ready",
  },
];

const PlatformTour = () => (
  <section id="platform" className="border-y border-border bg-muted/10 py-16 font-sans text-xs">
    <div className="container mx-auto px-4 max-w-6xl space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            System Architecture
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            A complete expense control loop.
          </h2>
        </div>
        <p className="text-xs text-muted-foreground max-w-md">
          Every transaction moves through an immutable state lifecycle with transparent risk assessments at every milestone.
        </p>
      </div>

      {/* 5-step lifecycle tiles */}
      <div className="grid gap-3 sm:grid-cols-5">
        {workflow.map((w, index) => (
          <div key={w.label} className="rounded-md border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <w.icon className="h-4 w-4 text-foreground" />
              <span className="font-mono text-[10px] font-bold text-muted-foreground">0{index + 1}</span>
            </div>
            <p className="font-bold text-foreground text-xs">{w.label}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{w.detail}</p>
          </div>
        ))}
      </div>

      {/* 3 role workspaces */}
      <div className="grid gap-4 sm:grid-cols-3">
        {workspaces.map((ws) => (
          <div key={ws.role} className="rounded-md border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-foreground inline-block">
                {ws.role}
              </span>
              <p className="font-bold text-sm text-foreground">{ws.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{ws.description}</p>
            </div>
            <div className="pt-3 border-t border-border/60 font-mono text-[10px] font-bold text-foreground">
              {ws.metric}
            </div>
          </div>
        ))}
      </div>

      {/* Dual Media Feature Showcase */}
      <div className="grid gap-6 sm:grid-cols-2 pt-4">
        {/* Feature 1: Card Tap-to-Pay Policy Enforcement */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="relative h-48 sm:h-56 bg-slate-900 overflow-hidden">
            <img
              src="/corporate-card-pay.jpg"
              alt="Instant POS Tap to Pay Policy Gate"
              className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-xs font-semibold text-emerald-400">
              Instant Point-of-Sale Guardrails
            </div>
          </div>
          <div className="p-4 sm:p-5 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Card Controls &amp; Limits
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Corporate Card Spend Policies
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Enforce daily spend limits, merchant category restrictions, and auto-approvals directly at swipe before transactions clear.
              </p>
            </div>
            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Automated Card Safeguards</span>
              <span className="font-semibold text-foreground">Zero Policy Overruns</span>
            </div>
          </div>
        </div>

        {/* Feature 2: In-Transit Business Travel */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="relative h-48 sm:h-56 bg-slate-900 overflow-hidden">
            <img
              src="/travel-expense.jpg"
              alt="Business Traveler In-Transit Receipt Ingestion"
              className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-xs font-semibold text-sky-400">
              Global Travel Support
            </div>
          </div>
          <div className="p-4 sm:p-5 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                  On-the-Go Expense Claims
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Seamless Multi-Currency Travel
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Capture airport transfers, hotel bills, and flight receipts on the go with automatic foreign exchange conversion and per-diem tracking.
              </p>
            </div>
            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Automatic FX Conversion</span>
              <span className="font-semibold text-foreground">Real-Time Currency Rates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default PlatformTour;
