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
    <section className="relative overflow-hidden bg-hero pt-16">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background)/0.45)_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background)/0.18)_100%)]" />
      {/* Glow orbs */}
      <div className="pointer-events-none absolute top-20 left-1/4 h-96 w-96 rounded-full bg-glow-primary/10 blur-3xl" style={{ animation: "pulse-glow 4s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-glow-secondary/10 blur-3xl" style={{ animation: "pulse-glow 4s ease-in-out infinite 1s" }} />

      <div className="container relative mx-auto px-4 pb-20 pt-24 md:pt-32">
        <div className="mx-auto max-w-3xl text-center" style={{ animation: "fade-in-up 0.8s ease-out forwards" }}>
          {/* Trust badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-sm text-foreground/85 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4" />
            Multi-tenant spend controls for modern finance teams
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
            Turn company spend into a{" "}
            <span className="text-gradient">controlled workflow.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground">
            VeriSpend connects receipt intelligence, policy enforcement, risk-based approvals, audit evidence, and finance analytics in one explainable operating system.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90 shadow-[0_18px_48px_-20px_hsl(var(--primary))]" onClick={handleStartTrial}>
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 rounded-full border-border bg-background/60 px-8 text-foreground hover:bg-accent backdrop-blur-sm">
              <ScanSearch className="h-4 w-4" /> Explore the platform
            </Button>
          </div>
        </div>

        {/* Stats showcase */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-[1.75rem] border border-border bg-card/70 p-5 text-center backdrop-blur-sm"
                style={{ animation: `fade-in-up 0.6s ease-out ${0.3 + i * 0.1}s forwards`, opacity: 0 }}
              >
                <div className="text-2xl font-extrabold text-primary md:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Product architecture summary */}
        <div className="mt-10 flex items-center justify-center gap-3" style={{ animation: "fade-in-up 0.8s ease-out 0.7s forwards", opacity: 0 }}>
          <Building2 className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">Tenant isolation</p>
          <GitBranch className="ml-3 h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">Policy-driven decisions</p>
          <ShieldCheck className="ml-3 h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">Evidence-ready audit trail</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
