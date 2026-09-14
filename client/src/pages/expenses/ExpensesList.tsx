import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ReceiptText, Search } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeading, money } from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { accountService } from "@/services/accountService";
import { clientService } from "@/services/clientService";
import { expenseCategories, expenseService, type CreateExpenseRequest, type Expense } from "@/services/expenseService";
import { projectService } from "@/services/projectService";

const emptyForm: CreateExpenseRequest = { accountId: "", merchant: "", category: "Software", amount: 0, currency: "USD", expenseDate: new Date().toISOString().slice(0, 10), description: "", reference: "" };

export default function ExpensesList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [open, setOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<CreateExpenseRequest>(emptyForm);
  const [formError, setFormError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(crypto.randomUUID());
  const expenses = useQuery({ queryKey: ["expenses"], queryFn: () => expenseService.list() });
  const summary = useQuery({ queryKey: ["expense-summary"], queryFn: expenseService.summary });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => accountService.getAccounts() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => clientService.getClients("Active") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => projectService.list({ status: "Active" }) });
  const operatingAccounts = (accounts.data?.data ?? []).filter(a => a.accountType === "Asset" && a.status === "Active" && !a.accountNumber.startsWith("TAX-VAULT-"));
  const filtered = useMemo(() => (expenses.data ?? []).filter(e => (!category || e.category === category) && `${e.merchant} ${e.description ?? ""} ${e.reference ?? ""}`.toLowerCase().includes(search.toLowerCase())), [expenses.data, category, search]);

  const create = useMutation({ mutationFn: () => expenseService.create(form, idempotencyKey), onSuccess: async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["expenses"] }), queryClient.invalidateQueries({ queryKey: ["expense-summary"] }), queryClient.invalidateQueries({ queryKey: ["overview"] }), queryClient.invalidateQueries({ queryKey: ["transactions"] })]);
    setOpen(false); setForm(emptyForm); setFormError(""); toast.success("Expense recorded and financial totals updated.");
  }, onError: (error: any) => setFormError(error.response?.data?.message ?? "We couldn't record this expense. Review the details and try again.") });
  const voidExpense = useMutation({ mutationFn: (id: string) => expenseService.void(id, "Entered incorrectly"), onSuccess: async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["expenses"] }), queryClient.invalidateQueries({ queryKey: ["expense-summary"] }), queryClient.invalidateQueries({ queryKey: ["overview"] })]);
    setVoidTarget(null); toast.success("Expense voided. A compensating ledger entry preserved the history.");
  }, onError: () => toast.error("We couldn't void this expense.") });

  function openCreate() {
    const account = operatingAccounts[0];
    setForm({ ...emptyForm, accountId: account?.id ?? "", currency: account?.currency ?? "USD" });
    setIdempotencyKey(crypto.randomUUID()); setFormError(""); setOpen(true);
  }

  return <DashboardLayout><div className="space-y-6">
    <PageHeading title="Expenses" description="Record business spending with a clear category and optional client or project context."><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add expense</Button></PageHeading>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border bg-card p-5"><p className="text-xs font-medium text-muted-foreground">This month</p><p className="mt-2 text-2xl font-semibold tabular-nums">{summary.isLoading ? "—" : money(summary.data?.total ?? 0, summary.data?.currency ?? "USD")}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-xs font-medium text-muted-foreground">Recorded expenses</p><p className="mt-2 text-2xl font-semibold tabular-nums">{summary.data?.count ?? 0}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-xs font-medium text-muted-foreground">Largest category</p><p className="mt-2 text-lg font-semibold">{summary.data?.byCategory[0]?.category ?? "No activity"}</p></div></div>
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search expenses</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search merchant, note, or reference" className="pl-9" /></label><select aria-label="Expense category" className="h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{expenseCategories.map(value => <option key={value}>{value}</option>)}</select></div>
    {expenses.isError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">We couldn't load expenses. <button className="font-semibold underline" onClick={() => expenses.refetch()}>Try again</button></div>}
    {expenses.isLoading ? <div role="status" className="h-72 animate-pulse rounded-xl bg-muted" /> : filtered.length === 0 ? <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center"><ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 font-semibold">{expenses.data?.length ? "No expenses match" : "No expenses yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Record software, equipment, workspace, and other business costs to understand where money goes.</p><Button className="mt-5" onClick={openCreate}>Add your first expense</Button></div> : <div className="overflow-hidden rounded-xl border bg-card"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Merchant</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(expense => <tr key={expense.id} className={`border-t ${expense.status === "Void" ? "opacity-55" : ""}`}><td className="px-4 py-3"><p className="font-medium">{expense.merchant}</p><p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{expense.description || expense.reference || "No note"}</p></td><td className="whitespace-nowrap px-4 py-3">{expense.category}</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{expense.projectName ?? "—"}</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(expense.expenseDate).toLocaleDateString()}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{expense.status === "Void" ? "Voided" : money(expense.amount, expense.currency)}</td><td className="px-4 py-3 text-right">{expense.status === "Posted" && <Button size="sm" variant="ghost" onClick={() => setVoidTarget(expense)}>Void</Button>}</td></tr>)}</tbody></table></div></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add expense</DialogTitle><DialogDescription>This creates a permanent financial record. If it is entered incorrectly, void it to preserve the audit trail.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!form.accountId || !form.merchant.trim() || form.amount <= 0) { setFormError("Account, merchant, and an amount greater than zero are required."); return; } create.mutate(); }}>
      {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="expense-merchant">Merchant</Label><Input id="expense-merchant" value={form.merchant} onChange={e => setForm(v => ({ ...v, merchant: e.target.value }))} required /></div><div className="space-y-2"><Label htmlFor="expense-category">Category</Label><select id="expense-category" value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{expenseCategories.map(value => <option key={value}>{value}</option>)}</select></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="expense-amount">Amount</Label><Input id="expense-amount" type="number" min="0.01" step="0.01" value={form.amount || ""} onChange={e => setForm(v => ({ ...v, amount: Number(e.target.value) }))} required /></div><div className="space-y-2"><Label htmlFor="expense-date">Date</Label><Input id="expense-date" type="date" max={new Date().toISOString().slice(0,10)} value={form.expenseDate} onChange={e => setForm(v => ({ ...v, expenseDate: e.target.value }))} required /></div></div>
      <div className="space-y-2"><Label htmlFor="expense-account">Paid from</Label><select id="expense-account" value={form.accountId} onChange={e => { const account = operatingAccounts.find(a => a.id === e.target.value); setForm(v => ({ ...v, accountId: e.target.value, currency: account?.currency ?? v.currency })); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Select account</option>{operatingAccounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} · {money(a.cachedBalance, a.currency)}</option>)}</select></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="expense-client">Client (optional)</Label><select id="expense-client" value={form.clientId ?? ""} onChange={e => setForm(v => ({ ...v, clientId: e.target.value || undefined, projectId: undefined }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">No client</option>{clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="expense-project">Project (optional)</Label><select id="expense-project" value={form.projectId ?? ""} onChange={e => setForm(v => ({ ...v, projectId: e.target.value || undefined }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">No project</option>{projects.data?.filter(p => !form.clientId || p.clientId === form.clientId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
      <div className="space-y-2"><Label htmlFor="expense-note">Description (optional)</Label><Textarea id="expense-note" value={form.description ?? ""} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} /></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending || operatingAccounts.length === 0}>{create.isPending ? "Recording…" : "Record expense"}</Button></DialogFooter>
    </form></DialogContent></Dialog>
    <Dialog open={!!voidTarget} onOpenChange={value => !value && setVoidTarget(null)}><DialogContent><DialogHeader><DialogTitle>Void this expense?</DialogTitle><DialogDescription>This keeps the original {voidTarget ? money(voidTarget.amount, voidTarget.currency) : ""} expense in your history and creates a compensating ledger entry. Reports and balances will update.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setVoidTarget(null)}>Keep expense</Button><Button variant="destructive" disabled={voidExpense.isPending} onClick={() => voidTarget && voidExpense.mutate(voidTarget.id)}>{voidExpense.isPending ? "Voiding…" : "Void expense"}</Button></DialogFooter></DialogContent></Dialog>
  </div></DashboardLayout>;
}
