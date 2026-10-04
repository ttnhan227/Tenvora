import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export function PageHeader({ eyebrow, title, description, actions, actionsFullWidth = true }: { eyebrow?: string; title: string; description: string; actions?: ReactNode; actionsFullWidth?: boolean }) {
  return (
    <header className={cn("flex flex-col justify-between gap-5", !actionsFullWidth && "sm:flex-row sm:items-end")}>
      <div className="max-w-2xl">
        {eyebrow && <span className="notebook-label">{eyebrow}</span>}
        <h1 className="page-title mt-3 text-foreground">{title}</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {actions && (
        <div className={cn(
          "flex flex-wrap items-center gap-2 [&_button]:h-10 [&_a]:h-10",
          actionsFullWidth && "w-full [&>div]:flex [&>div]:w-full [&>div]:flex-wrap [&>div]:items-center [&>div]:gap-2 lg:[&>div]:flex-nowrap lg:[&>div>*:last-child]:ml-auto lg:[&>*:last-child]:ml-auto"
        )}>
          {actions}
        </div>
      )}
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

export function LoadingState({ label }: { label?: string }) {
  const { isVietnamese } = useLanguage();
  return (
    <div role="status" className="paper-card flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
      <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm font-medium">{label ?? (isVietnamese ? "Đang mở sổ ghi chép…" : "Opening your records…")}</p>
    </div>
  );
}

export function PrerequisiteNotice({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-primary/35 bg-accent/35 p-4 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0 [&_a]:gap-2">
        {action}
      </div>
      <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
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
      {featured && <div className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full border-18 border-primary/5" />}
    </article>
  );
}

export function StatusPill({ status }: { status: string }) {
  const { isVietnamese } = useLanguage();
  const normalized = status.toLowerCase();
  const tone = normalized === "paid" || normalized === "active"
    ? "border-[hsl(var(--success)/.25)] bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]"
    : normalized.includes("partial")
      ? "border-[hsl(var(--warning)/.35)] bg-[hsl(var(--warning)/.13)] text-amber-800 dark:text-amber-300"
      : "border-[hsl(var(--destructive)/.2)] bg-[hsl(var(--destructive)/.08)] text-destructive";
  const localized = isVietnamese ? ({ paid: "Đã thanh toán", "partially paid": "Thanh toán một phần", unpaid: "Chưa thanh toán", active: "Đang hoạt động", disabled: "Đã vô hiệu hoá", archived: "Đã lưu trữ" }[normalized] ?? status) : status;
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", tone)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{localized}</span>;
}
