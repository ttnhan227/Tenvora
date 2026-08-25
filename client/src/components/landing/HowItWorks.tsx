import { Upload, Cpu, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Ingest Receipts & Data",
    description: "Drag and drop receipts or enter transactions directly in the fast-entry ledger.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "Automated Policy Evaluation",
    description: "The risk engine evaluates transactions against corporate budgets and fraud heuristics in real-time.",
  },
  {
    icon: CheckCircle,
    step: "03",
    title: "Review, Approve & Sync",
    description: "Managers review prioritized queues with clear signal tags and sync approved claims to QuickBooks or Xero.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="border-t border-border bg-muted/10 py-16 font-sans text-xs">
      <div className="container mx-auto px-4 max-w-5xl space-y-10">
        <div className="text-center space-y-2 max-w-lg mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Simple Onboarding
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Operational in three steps
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="rounded-md border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-muted/30 text-foreground">
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="font-mono text-xs font-bold text-muted-foreground">{s.step}</span>
              </div>
              <p className="font-bold text-sm text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
