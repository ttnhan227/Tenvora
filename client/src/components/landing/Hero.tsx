import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, GitBranch, ScanSearch, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const stats = [
  { value: "3", label: "Role-specific workspaces" },
  { value: "6+", label: "Explainable risk signals" },
  { value: "4", label: "Compliance & audit controls" },
  { value: "2", label: "Accounting export formats" },
];

const Hero = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleStartTrial = () => {
    if (isAuthenticated) {
      navigate("/subscription?plan=professional");
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="relative overflow-hidden bg-background pt-24 pb-16 font-sans text-xs">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          {/* Trust Signal Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent-signal))]" />
            Corporate Expense Management & Compliance Guardrails
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
            Turn company spend into an explainable, controlled workflow.
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            VeriSpend unifies OCR receipt intelligence, policy enforcement, multi-factor risk scoring, forensic audit evidence, and 1-click accounting sync in one high-trust operating system.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Button
              size="sm"
              variant="signal"
              onClick={handleStartTrial}
              className="font-bold gap-1.5 h-9 px-5"
            >
              Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const el = document.getElementById("platform");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                } else {
                  navigate("/login");
                }
              }}
              className="font-semibold h-9 px-5"
            >
              Explore Platform
            </Button>
          </div>
        </div>

        {/* Financial Stat Tiles */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-4xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="rounded-md border border-border bg-card p-3.5 text-center space-y-0.5">
              <p className="text-2xl font-bold font-mono text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Feature Pillars */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-foreground" />
            <span>Multi-tenant isolation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-foreground" />
            <span>Policy-driven auto approvals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
            <span>SOX 404 SHA-256 hash chains</span>
          </div>
        </div>

        {/* Media + Live UI Product Showcase Frame */}
        <div className="mt-14 max-w-5xl mx-auto rounded-xl border border-border bg-card overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-foreground text-xs">
                Real-Time Expense Activity
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                Policy engine active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left: Real VeriSpend Expense Review Interface */}
            <div className="lg:col-span-7 relative min-h-[340px] bg-slate-900 overflow-hidden">
              <img
                src="/verispend-review.png"
                alt="VeriSpend Real Expense Audit, AI Assistant & Deterministic Policy Checks"
                className="w-full h-full object-cover object-left-top opacity-95 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="inline-flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-xs font-medium text-emerald-400 mb-1.5">
                  <ScanSearch className="h-3.5 w-3.5" />
                  Deterministic Risk &amp; Policy Review
                </div>
                <p className="text-sm font-semibold leading-snug text-slate-100">
                  Automated expense validation, OCR verification, and audit trails across distributed teams
                </p>
              </div>
            </div>

            {/* Right: Live Policy Feed */}
            <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between bg-card space-y-3">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-foreground">
                    Recent Transactions &amp; Approvals
                  </p>
                  <span className="text-[11px] text-muted-foreground">Live Feed</span>
                </div>

                <div className="space-y-2.5">
                  {/* Stream Card 1 */}
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Delta Air Lines</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">$1,486.40</span>
                    </div>
                    <p className="text-[11px] text-red-700 dark:text-red-300 font-medium">
                      Travel &gt; $1,000 threshold requires director approval
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-red-500/10">
                      <span>Travel Policy Check</span>
                      <span className="font-semibold text-red-600">Pending Review</span>
                    </div>
                  </div>

                  {/* Stream Card 2 */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">The Capital Grille</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">$286.20</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      Receipt parsed · Missing attendee list
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-amber-500/10">
                      <span>Meals &amp; Entertainment</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">Needs Attendee Form</span>
                    </div>
                  </div>

                  {/* Stream Card 3 */}
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Amazon Web Services</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">$1,420.50</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                      Recurring software invoice verified against PO
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/10">
                      <span>Cloud Infrastructure</span>
                      <span className="font-semibold text-emerald-600">Auto-Approved</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Enterprise Policy Compliance</span>
                <span className="font-semibold text-foreground">Audit-Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
