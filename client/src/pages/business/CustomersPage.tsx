import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Pencil, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiError, businessMoney, businessService, BusinessCustomer, CustomerInput } from "@/services/businessService";

const emptyCustomer: CustomerInput = { name: "", phone: "", email: "", address: "", notes: "", status: "Active" };

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessCustomer | null>(null);
  const [form, setForm] = useState<CustomerInput>(emptyCustomer);
  const { data = [], isLoading } = useQuery({
    queryKey: ["business-customers", search],
    queryFn: () => businessService.getCustomers(search),
  });

  const save = useMutation({
    mutationFn: () => editing ? businessService.updateCustomer(editing.id, form) : businessService.createCustomer(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      setDialogOpen(false);
      toast.success(editing ? "Customer updated" : "Customer added");
    },
    onError: (error) => toast.error(apiError(error, "Could not save the customer.")),
  });

  const openCreate = () => { setEditing(null); setForm(emptyCustomer); setDialogOpen(true); };
  const openEdit = (customer: BusinessCustomer) => {
    setEditing(customer);
    setForm({ name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "", address: customer.address ?? "", notes: customer.notes ?? "", status: customer.status });
    setDialogOpen(true);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader eyebrow="People you sell to" title="Customers" description="Keep names, contact details, sales, payments, and current balances together." actions={<Button onClick={openCreate}><Plus />Add customer</Button>} />

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, phone, or email" className="pl-9" />
        </div>

        {isLoading ? <LoadingState label="Opening your customer list…" /> : data.length === 0 ? (
          <EmptyState icon={Users} title={search ? "No customers match that search" : "No customers yet"} description={search ? "Try a name, phone number, or email address." : "Add the first person or business you sell to. Their balance will update automatically with every sale and payment."} action={!search && <Button onClick={openCreate}>Add first customer</Button>} />
        ) : (
          <div className="paper-card overflow-hidden">
            <div className="divide-y">
              {data.map((customer) => (
                <div key={customer.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0"><Link to={`/customers/${customer.id}`} className="font-semibold hover:text-primary">{customer.name}</Link><p className="mt-1 truncate text-sm text-muted-foreground">{[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}</p></div>
                  <div className="sm:text-right"><p className={customer.outstandingBalance > 0 ? "font-semibold text-amber-600" : "font-semibold"}>{businessMoney(customer.outstandingBalance, customer.currency)}</p><p className="mt-1 text-xs text-muted-foreground">outstanding · {customer.salesCount} sales</p></div>
                  <div className="flex gap-1 sm:justify-end"><Button variant="ghost" size="icon" aria-label={`Edit ${customer.name}`} onClick={() => openEdit(customer)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" asChild><Link aria-label={`View ${customer.name}`} to={`/customers/${customer.id}`}><ArrowRight size={16} /></Link></Button></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><span className="notebook-label w-fit">Customer card</span><DialogTitle className="mt-2">{editing ? "Edit customer" : "Add customer"}</DialogTitle><DialogDescription>Save the details you use to recognize and contact this customer.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="customer-name">Name *</Label><Input id="customer-name" autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="customer-phone">Phone</Label><Input id="customer-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="customer-email">Email</Label><Input id="customer-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></div>
            <div className="space-y-2"><Label htmlFor="customer-address">Address</Label><Input id="customer-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="customer-notes">Notes</Label><Textarea id="customer-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything useful to remember" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save customer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
