import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, Compass, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { path: "/dashboard", label: "Spend overview" },
  { path: "/manager/pending", label: "Review approval queue" },
  { path: "/policy-lab", label: "Test policy simulator" },
  { path: "/compliance", label: "Forensic audit & SOX" },
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

  return (
    <div className="border-b border-border bg-card px-4 py-2.5 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--accent-signal))]" />
            <div>
              <span className="text-[11px] font-bold tracking-tight text-foreground uppercase">
                Interactive Sandbox Workspace
              </span>
              <span className="text-[11px] text-muted-foreground ml-2 hidden sm:inline">
                Isolated evaluation tenant (active for 8 hours)
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {open && (
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            {steps.map((step, index) => {
              const done = completed.has(step.path);
              const active = location.pathname === step.path;
              return (
                <Link
                  key={step.path}
                  to={step.path}
                  onClick={() => visit(step.path)}
                  className={`flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-primary bg-secondary text-foreground font-semibold"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-mono font-bold ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="truncate text-xs">{step.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
