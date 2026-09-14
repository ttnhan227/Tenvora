import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartNoAxesCombined } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeading, money } from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportService } from "@/services/reportService";

function startOfYear() { return `${new Date().getFullYear()}-01-01`; }
function today() { return new Date().toISOString().slice(0, 10); }

export default function ReportsPage() {
  const [draftFrom, setDraftFrom] = useState(startOfYear());
  const [draftTo, setDraftTo] = useState(today());
  const [range, setRange] = useState({ from: draftFrom, to: draftTo });
  const report = useQuery({ queryKey: ["reports", range], queryFn: () => reportService.get(range.from, range.to) });
  const data = report.data;
  return <DashboardLayout><div className="space-y-6">
    <PageHeading title="Reports" description="Understand cash flow, client concentration, and spending patterns from posted financial records." />
    <form className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end" onSubmit={e => { e.preventDefault(); setRange({ from: draftFrom, to: draftTo }); }}><div className="space-y-2"><Label htmlFor="report-from">From</Label><Input id="report-from" type="date" value={draftFrom} onChange={e => setDraftFrom(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="report-to">To</Label><Input id="report-to" type="date" value={draftTo} onChange={e => setDraftTo(e.target.value)} /></div><Button type="submit">Apply range</Button></form>
    {report.isError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">We couldn't build this report. <button className="font-semibold underline" onClick={() => report.refetch()}>Try again</button></div>}
    {report.isLoading ? <div role="status" className="h-80 animate-pulse rounded-xl bg-muted" /> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Income" value={money(data.income, data.currency)} tone="positive" /><Metric label="Expenses" value={money(data.expenses, data.currency)} /><Metric label="Net cash flow" value={money(data.net, data.currency)} tone={data.net >= 0 ? "positive" : "negative"} /><Metric label="Outstanding invoices" value={money(data.outstandingInvoices, data.currency)} /></div>
      {data.income === 0 && data.expenses === 0 ? <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center"><ChartNoAxesCombined className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 font-semibold">No activity in this range</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Record an invoice payment or expense, or choose a wider date range, to build your cash-flow report.</p></div> : <div className="rounded-xl border bg-card p-5"><div><h2 className="font-semibold">Income vs expenses</h2><p className="mt-1 text-sm text-muted-foreground">Monthly posted activity in {data.currency}</p></div><div className="mt-6 h-72" aria-label="Monthly income and expense chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.cashFlow}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} width={70} /><Tooltip formatter={(value: number) => money(value, data.currency)} /><Legend /><Bar name="Income" dataKey="income" fill="hsl(var(--success))" radius={[4,4,0,0]} /><Bar name="Expenses" dataKey="expenses" fill="hsl(var(--foreground))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></div>}
      <div className="grid gap-4 lg:grid-cols-2"><Breakdown title="Income by client" rows={data.incomeByClient} currency={data.currency} empty="Payments linked to clients will appear here." /><Breakdown title="Expenses by category" rows={data.expensesByCategory} currency={data.currency} empty="Posted expenses will appear here." /></div>
    </>}
  </div></DashboardLayout>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) { return <div className="rounded-xl border bg-card p-5"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold tabular-nums ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-destructive" : ""}`}>{value}</p></div>; }
function Breakdown({ title, rows, currency, empty }: { title: string; rows: Array<{ name: string; amount: number }>; currency: string; empty: string }) { const max = Math.max(...rows.map(r => r.amount), 1); return <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">{title}</h2>{rows.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">{empty}</p> : <div className="mt-5 space-y-4">{rows.slice(0, 7).map(row => <div key={row.name}><div className="flex justify-between gap-4 text-sm"><span>{row.name}</span><span className="font-semibold tabular-nums">{money(row.amount, currency)}</span></div><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(4, row.amount / max * 100)}%` }} /></div></div>)}</div>}</section>; }
