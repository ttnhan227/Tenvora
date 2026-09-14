import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, FolderKanban, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeading, money } from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientService } from "@/services/clientService";
import { projectService, type CreateProjectRequest } from "@/services/projectService";

const initialForm: CreateProjectRequest = { clientId: "", name: "", description: "", status: "Active", currency: "USD" };

export default function ProjectsList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Active");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateProjectRequest>(initialForm);
  const [formError, setFormError] = useState("");
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => projectService.list() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => clientService.getClients("Active") });
  const filtered = useMemo(() => (projects.data ?? []).filter(project =>
    (!status || project.status === status) && `${project.name} ${project.clientName}`.toLowerCase().includes(search.toLowerCase())), [projects.data, search, status]);

  const create = useMutation({
    mutationFn: () => projectService.create(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false); setForm(initialForm); setFormError(""); toast.success("Project created.");
    },
    onError: (error: any) => setFormError(error.response?.data?.message ?? "We couldn't create this project. Review the details and try again."),
  });
  const archive = useMutation({
    mutationFn: projectService.archive,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project archived. Its financial history is preserved."); },
    onError: () => toast.error("We couldn't archive this project."),
  });

  function openCreate() {
    const client = clients.data?.[0];
    setForm({ ...initialForm, clientId: client?.id ?? "", currency: client?.currency ?? "USD", startDate: new Date().toISOString().slice(0, 10) });
    setFormError(""); setOpen(true);
  }

  return <DashboardLayout><div className="space-y-6">
    <PageHeading title="Projects" description="Connect client work to invoices and expenses so each engagement has a reliable financial picture.">
      <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New project</Button>
    </PageHeading>
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row">
      <label className="relative flex-1"><span className="sr-only">Search projects</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Search project or client" /></label>
      <select aria-label="Project status" value={status} onChange={e => setStatus(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All statuses</option><option>Planned</option><option>Active</option><option>Completed</option><option>Archived</option></select>
    </div>
    {projects.isError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">We couldn't load projects. <button className="font-semibold underline" onClick={() => projects.refetch()}>Try again</button></div>}
    {projects.isLoading ? <div role="status" className="grid gap-4 md:grid-cols-2">{[0,1,2,3].map(i => <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />)}</div> : filtered.length === 0 ?
      <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center"><FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 font-semibold">{projects.data?.length ? "No projects match" : "No projects yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Create a project to connect a client's work, invoices, and expenses in one place.</p><Button className="mt-5" onClick={openCreate}>Create your first project</Button></div> :
      <div className="grid gap-4 md:grid-cols-2">{filtered.map(project => <article key={project.id} className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-muted-foreground">{project.clientName}</p><h2 className="mt-1 text-lg font-semibold">{project.name}</h2></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{project.status}</span></div>
        {project.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm"><div><dt className="text-xs text-muted-foreground">Billed</dt><dd className="mt-1 font-semibold tabular-nums">{money(project.totalBilled, project.currency)}</dd></div><div><dt className="text-xs text-muted-foreground">Received</dt><dd className="mt-1 font-semibold tabular-nums text-emerald-600">{money(project.totalReceived, project.currency)}</dd></div><div><dt className="text-xs text-muted-foreground">Expenses</dt><dd className="mt-1 font-semibold tabular-nums">{money(project.totalExpenses, project.currency)}</dd></div><div><dt className="text-xs text-muted-foreground">Outstanding</dt><dd className="mt-1 font-semibold tabular-nums">{money(project.outstandingAmount, project.currency)}</dd></div></dl>
        {project.status !== "Archived" && <div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" disabled={archive.isPending} onClick={() => archive.mutate(project.id)}><Archive className="mr-2 h-4 w-4" />Archive</Button></div>}
      </article>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create project</DialogTitle><DialogDescription>Organize one client engagement and its financial activity.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!form.clientId || !form.name.trim()) { setFormError("Client and project name are required."); return; } create.mutate(); }}>
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <div className="space-y-2"><Label htmlFor="project-client">Client</Label><select id="project-client" value={form.clientId} onChange={e => { const client = clients.data?.find(c => c.id === e.target.value); setForm(v => ({ ...v, clientId: e.target.value, currency: client?.currency ?? v.currency })); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Select a client</option>{clients.data?.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="project-name">Project name</Label><Input id="project-name" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} maxLength={200} required /></div>
        <div className="space-y-2"><Label htmlFor="project-description">Description</Label><Textarea id="project-description" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="project-start">Start date</Label><Input id="project-start" type="date" value={form.startDate ?? ""} onChange={e => setForm(v => ({ ...v, startDate: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="project-budget">Budget ({form.currency})</Label><Input id="project-budget" type="number" min="0" step="0.01" value={form.budgetAmount ?? ""} onChange={e => setForm(v => ({ ...v, budgetAmount: e.target.value ? Number(e.target.value) : undefined }))} /></div></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create project"}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog></div></DashboardLayout>;
}
