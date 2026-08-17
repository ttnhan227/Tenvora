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
    <section className="relative overflow-hidden bg-background pt-16 font-sans">
      <div className="container relative mx-auto px-4 pb-20 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Trust badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-foreground/80 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Multi-tenant spend controls for modern finance teams
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            Turn company spend into a{" "}
            <span className="text-primary">controlled workflow.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground">
            VeriSpend connects receipt intelligence, policy enforcement, risk-based approvals, audit evidence, and finance analytics in one explainable operating system.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button 
              size="lg" 
              className="gap-2 rounded-lg bg-primary px-7 text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold h-11 text-sm" 
              onClick={handleStartTrial}
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 rounded-lg border-border bg-card px-7 text-foreground hover:bg-muted font-medium h-11 text-sm"
              onClick={() => {
                const el = document.getElementById("platform");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                } else {
                  navigate("/login");
                }
              }}
            >
              <ScanSearch className="h-4 w-4 text-muted-foreground" /> Explore the Platform
            </Button>
          </div>
        </div>

        {/* Stats showcase */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5 text-center shadow-sm"
              >
                <div className="text-2xl font-bold text-primary font-mono md:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Product architecture summary */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Tenant isolation</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <span>Policy-driven decisions</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Evidence-ready audit trail</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
