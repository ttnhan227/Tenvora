import { Brain, Building2, FileBarChart, GitPullRequestArrow, ShieldCheck, Workflow } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Explainable Risk Engine",
    description: "Score claims across duplicate, policy, amount, category, evidence, and behavioral signals, with reasons reviewers can inspect.",
    color: "bg-primary/10 text-primary",
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
  },
  {
    icon: Workflow,
    title: "Approval Orchestration",
    description: "Move claims from draft through risk review and decision, with safe auto-approval for eligible expenses.",
    color: "bg-primary/10 text-primary",
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
  },
  {
    icon: FileBarChart,
    title: "Finance Intelligence",
    description: "Monitor budgets, seasonal spend, review SLAs, policy trends, forecasted overruns, and operational KPIs.",
    color: "bg-primary/10 text-primary",
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
  },
  {
    icon: Building2,
    title: "Multi-tenant Architecture",
    description: "Keep organizations isolated across users, expenses, policies, analytics, subscriptions, and audit records.",
    color: "bg-primary/10 text-primary",
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Evidence",
    description: "Generate SOX-oriented audit trails, SOC 2 control reports, and GDPR export or deletion workflows.",
    color: "bg-primary/10 text-primary",
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
  },
  {
    icon: GitPullRequestArrow,
    title: "Connected Operations",
    description: "Use email, Slack, scheduled digests, and in-app alerts; export approved spend to QuickBooks or Xero.",
    color: "bg-primary/10 text-primary",
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.08),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_60%)]" />
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/70 px-4 py-1.5 text-sm font-medium text-secondary-foreground backdrop-blur-sm">
            <Brain className="h-4 w-4" />
            Platform capabilities
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Built for the full{" "}
            <span className="text-gradient">spend lifecycle</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A connected system of record, decision engine, control layer, and evidence trail.
          </p>
        </div>

        {/* Top 3 featured cards — larger */}
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {features.slice(0, 3).map((feature, i) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-[1.9rem] border border-border/60 bg-card/85 p-8 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
              style={{ animation: `fade-in-up 0.6s ease-out ${i * 0.1}s forwards`, opacity: 0 }}
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 transition-all group-hover:scale-110 group-hover:bg-primary/10" />
              <div className={`relative mb-5 flex h-14 w-14 items-center justify-center rounded-xl ${feature.color} transition-colors ${feature.hoverColor}`}>
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom 3 cards */}
        <div className="mx-auto mt-6 grid max-w-5xl gap-6 md:grid-cols-3">
          {features.slice(3).map((feature, i) => (
            <div
              key={feature.title}
              className="group rounded-[1.7rem] border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
              style={{ animation: `fade-in-up 0.6s ease-out ${(i + 3) * 0.1}s forwards`, opacity: 0 }}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} transition-colors ${feature.hoverColor}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
