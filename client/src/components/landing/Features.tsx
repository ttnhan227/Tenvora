import { Brain, Building2, FileBarChart, GitPullRequestArrow, ShieldCheck, Workflow } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Explainable Risk Engine",
    description: "Score claims across duplicate, policy, amount, category, evidence, and behavioral signals with reasons reviewers can inspect.",
  },
  {
    icon: Workflow,
    title: "Approval Orchestration",
    description: "Move claims from draft through risk review and decision, with safe auto-approval for eligible low-risk expenses.",
  },
  {
    icon: FileBarChart,
    title: "Finance Intelligence",
    description: "Monitor budgets, seasonal spend, review SLAs, policy trends, forecasted overruns, and operational KPIs.",
  },
  {
    icon: Building2,
    title: "Multi-tenant Architecture",
    description: "Keep organizations isolated across users, expenses, policies, analytics, subscriptions, and audit records.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Evidence",
    description: "Generate SOX-oriented audit trails, SOC 2 control reports, and GDPR export or deletion workflows.",
  },
  {
    icon: GitPullRequestArrow,
    title: "Connected Operations",
    description: "Use email, Slack, scheduled digests, and in-app alerts; export approved spend to QuickBooks or Xero.",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative py-24 font-sans">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1 text-xs font-medium text-muted-foreground">
            <Brain className="h-3.5 w-3.5 text-primary" />
            Platform Capabilities
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Built for the full{" "}
            <span className="text-primary">spend lifecycle</span>
          </h2>
          <p className="text-base text-muted-foreground">
            A connected system of record, decision engine, control layer, and evidence trail.
          </p>
        </div>

        {/* Grid of features */}
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-base font-bold text-foreground">{feature.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
