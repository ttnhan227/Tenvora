import { type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
export function usePermissions() { const { user } = useAuth(); return { canManage: ["SoloFreelancer", "TenantAdmin", "OperationsManager"].includes(user?.role ?? ""), canReconcile: ["SoloFreelancer", "TenantAdmin", "OperationsManager", "ComplianceOfficer"].includes(user?.role ?? "") }; }
export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) { return <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p></div>{children}</div>; }
export function Notice({ children }: { children: ReactNode }) { return <div role="status" className="rounded-lg border border-border bg-muted/30 p-4 text-sm">{children}</div>; }
export function Panel({ title, children }: { title?: string; children: ReactNode }) { return <section className="rounded-xl border border-border bg-card p-5 shadow-sm">{title && <h2 className="mb-4 text-base font-semibold">{title}</h2>}{children}</section>; }
export const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 4 }).format(amount);
