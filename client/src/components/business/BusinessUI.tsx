import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="max-w-2xl">
        {eyebrow && <span className="notebook-label">{eyebrow}</span>}
        <h1 className="page-title mt-3 text-foreground">{title}</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: { icon: LucideIcon; title: string; description: string; action?: ReactNode; compact?: boolean }) {
  return (
    <section className={cn("paper-card relative overflow-hidden border-dashed px-6 text-center", compact ? "py-9" : "py-14 sm:py-16")}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 paper-lines opacity-45" />
      <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-accent/70 text-primary shadow-sm">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="relative mt-4 text-lg font-bold">{title}</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="relative mt-6">{action}</div>}
    </section>
  );
}

export function LoadingState({ label = "Opening your records…" }: { label?: string }) {
  return (
    <div role="status" className="paper-card flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
      <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function MoneyCard({ label, value, detail, icon: Icon, tone = "plain", featured = false }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: "plain" | "good" | "attention" | "out"; featured?: boolean }) {
  const tones = {
    plain: "bg-card",
    good: "bg-[hsl(var(--success)/.09)] border-[hsl(var(--success)/.23)]",
    attention: "bg-[hsl(var(--warning)/.12)] border-[hsl(var(--warning)/.3)]",
    out: "bg-[hsl(var(--destructive)/.055)] border-[hsl(var(--destructive)/.16)]",
  };
  return (
    <article className={cn("paper-card relative overflow-hidden p-5", tones[tone], featured && "sm:col-span-2 sm:p-7")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-foreground/75">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card/70 text-primary"><Icon className="h-4 w-4" /></span>
      </div>
      <p className={cn("metric-value mt-4 font-bold tracking-tight", featured ? "text-3xl sm:text-4xl" : "text-2xl")}>{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      {featured && <div className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full border-[18px] border-primary/5" />}
    </article>
  );
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === "paid" || normalized === "active"
    ? "border-[hsl(var(--success)/.25)] bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]"
    : normalized.includes("partial")
      ? "border-[hsl(var(--warning)/.35)] bg-[hsl(var(--warning)/.13)] text-amber-800 dark:text-amber-300"
      : "border-[hsl(var(--destructive)/.2)] bg-[hsl(var(--destructive)/.08)] text-destructive";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", tone)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}
