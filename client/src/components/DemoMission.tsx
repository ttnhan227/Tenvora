import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, Compass, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { path: "/dashboard", label: "Read the control overview" },
  { path: "/manager/pending", label: "Investigate a flagged claim" },
  { path: "/policy-lab", label: "Simulate new guardrails" },
  { path: "/compliance", label: "Inspect compliance evidence" },
];

export const DemoMission = ({ email }: { email?: string }) => {
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [visited, setVisited] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("verispend-demo-visited") || "[]"); } catch { return []; }
  });
  const isDemo = email?.endsWith("@demo.verispend.app");
  const completed = useMemo(() => new Set([...visited, location.pathname]), [visited, location.pathname]);
  if (!isDemo) return null;

  const visit = (path: string) => {
    const next = Array.from(new Set([...visited, location.pathname, path]));
    setVisited(next); sessionStorage.setItem("verispend-demo-visited", JSON.stringify(next));
  };
  return <div className="border-b border-primary/15 bg-primary/5 px-4 py-3 md:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Compass className="h-5 w-5 text-primary"/><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Enterprise evaluation mission</p><p className="text-xs text-muted-foreground">Your organization is isolated and expires automatically in eight hours.</p></div></div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>{open ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}</Button>
      </div>
      {open && <div className="mt-3 grid gap-2 md:grid-cols-4">{steps.map((step, index) => {
        const done = completed.has(step.path); return <Link key={step.path} to={step.path} onClick={() => visit(step.path)} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition-colors ${location.pathname === step.path ? "border-primary/30 bg-background text-primary" : "border-border bg-background/60 hover:border-primary/20"}`}>
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{done ? <Check className="h-3.5 w-3.5"/> : index + 1}</span><span className="font-semibold">{step.label}</span>
        </Link>;
      })}</div>}
      {open && <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"><LockKeyhole className="h-3 w-3"/>Changes remain inside this disposable tenant.</div>}
    </div>
  </div>;
};
