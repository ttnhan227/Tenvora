import { Brain, Building2, FileBarChart, GitPullRequestArrow, ShieldCheck, Workflow } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Explainable Risk Engine",
    description: "Evaluates transactions across duplicate patterns, amount anomalies, policy rule violations, and behavioral history with clear audit justifications.",
  },
  {
    icon: Workflow,
    title: "Approval Orchestration",
    description: "Route claims through tiered manager approvals with safe auto-clearance for low-risk, compliant micro-expenses.",
  },
  {
    icon: FileBarChart,
    title: "Finance Intelligence",
    description: "Track departmental budget pools, seasonal expenditure trends, reviewer turnaround SLAs, and AI-driven budget overrun predictions.",
  },
  {
    icon: Building2,
    title: "Multi-tenant Architecture",
    description: "Strict logical separation across corporate users, receipts, policy parameters, subscription tiers, and financial ledgers.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Evidence",
    description: "Cryptographically linked SOX 404 SHA-256 hash chains, SOC 2 Type II controls readiness reports, and GDPR Right-to-Erasure tools.",
  },
  {
    icon: GitPullRequestArrow,
    title: "Connected Operations",
    description: "Seamlessly export cleared spend records to QuickBooks, Xero, and CSV ledgers with complete line-item breakdown.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-16 font-sans text-xs">
      <div className="container mx-auto px-4 max-w-6xl space-y-10">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Platform Capabilities
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Built for the full spend lifecycle
          </h2>
          <p className="text-xs text-muted-foreground">
            Unified system of record, risk evaluation engine, policy guardrails, and audit integrity logs.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="rounded-md border border-border bg-card p-4 space-y-2 hover:border-foreground/40 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-muted/20 text-foreground">
                <feat.icon className="h-4 w-4" />
              </div>
              <p className="font-bold text-sm text-foreground">{feat.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
