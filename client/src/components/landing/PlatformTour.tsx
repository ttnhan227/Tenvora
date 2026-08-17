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
  { role: "Employee", title: "Frictionless Submission", description: "Capture a receipt, verify extracted fields, submit, and track decisions from one workspace.", metric: "OCR-assisted intake" },
  { role: "Finance Manager", title: "Risk-Based Operations", description: "Review a prioritized queue with policy triggers, related claims, missing evidence, and recommended actions.", metric: "Explainable review queue" },
  { role: "Control Owner", title: "Organization Governance", description: "Manage team members, budgets, policy automation, tenant settings, compliance posture, and accounting exports.", metric: "SOX · SOC 2 · GDPR" },
];

const PlatformTour = () => (
  <section id="platform" className="relative border-y border-border bg-card/40 py-24 font-sans">
    <div className="container relative mx-auto px-4">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-primary" /> Product Lifecycle
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">More than expense tracking. <span className="text-primary">A complete control loop.</span></h2>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground">Every claim moves through one connected lifecycle, while each role gets the context and controls needed to act decisively.</p>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-5">
          {workflow.map((step, index) => (
            <div key={step.label} className="relative rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-4 w-4" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="font-semibold text-sm text-foreground">{step.label}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <div key={workspace.role} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground">{workspace.role}</span>
                <UsersRound className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">{workspace.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{workspace.description}</p>
              <div className="mt-5 border-t border-border pt-3 font-mono text-xs text-primary font-medium">{workspace.metric}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div>
            <p className="font-semibold text-sm text-foreground">Explore the platform with full multi-role workflows</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Multi-entity support, risk scoring, audit history, and accounting exports are ready to test.</p>
          </div>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            Open Secure Workspace <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default PlatformTour;
