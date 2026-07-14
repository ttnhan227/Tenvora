import { ArrowRight, BadgeCheck, BarChart3, BrainCircuit, FileCheck2, ReceiptText, ShieldAlert, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

const workflow = [
  { icon: ReceiptText, label: "Capture", detail: "Receipt OCR and structured expense intake" },
  { icon: BrainCircuit, label: "Assess", detail: "Explainable scoring and duplicate detection" },
  { icon: ShieldAlert, label: "Control", detail: "Budgets, policies, and approval guardrails" },
  { icon: BadgeCheck, label: "Decide", detail: "Prioritized review with AI recommendations" },
  { icon: FileCheck2, label: "Evidence", detail: "Immutable history and compliance exports" },
];

const workspaces = [
  { role: "Employee", title: "Frictionless submission", description: "Capture a receipt, verify extracted fields, submit, and follow every decision from one workspace.", metric: "OCR-assisted intake" },
  { role: "Finance manager", title: "Risk-based operations", description: "Work a priority queue with policy triggers, related claims, missing evidence, and recommended actions.", metric: "Explainable review queue" },
  { role: "Control owner", title: "Organization-wide governance", description: "Manage people, budgets, policy automation, tenant settings, compliance posture, and accounting exports.", metric: "SOX · SOC 2 · GDPR" },
];

const PlatformTour = () => (
  <section id="platform" className="relative overflow-hidden border-y border-border/60 bg-card/45 py-24">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_hsl(var(--primary)/0.10),_transparent_35%)]" />
    <div className="container relative mx-auto px-4">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <BarChart3 className="h-4 w-4" /> Enterprise product tour
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">More than expense tracking. <span className="text-gradient">A complete control loop.</span></h2>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground">Every claim moves through one connected lifecycle, while each role gets the context and controls needed to act confidently.</p>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-5">
          {workflow.map((step, index) => (
            <div key={step.label} className="group relative rounded-2xl border border-border/70 bg-background/75 p-5 shadow-sm">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><step.icon className="h-5 w-5" /></div>
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="font-semibold">{step.label}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
              {index < workflow.length - 1 && <ArrowRight className="absolute -right-3 top-9 z-10 hidden h-5 w-5 text-primary md:block" />}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <div key={workspace.role} className="rounded-[1.75rem] border border-border/70 bg-background/80 p-7 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">{workspace.role}</span>
                <UsersRound className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{workspace.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{workspace.description}</p>
              <div className="mt-6 border-t border-border/70 pt-4 font-mono text-xs text-primary">{workspace.metric}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5">
          <div>
            <p className="font-semibold">See the operating system with real seeded workflows</p>
            <p className="mt-1 text-sm text-muted-foreground">Multi-company data, role-scoped screens, risk cases, approvals, budgets, and audit history are included.</p>
          </div>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">Open secure workspace <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  </section>
);

export default PlatformTour;
