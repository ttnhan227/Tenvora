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
      </div>
    </section>
  );
};

export default Hero;
