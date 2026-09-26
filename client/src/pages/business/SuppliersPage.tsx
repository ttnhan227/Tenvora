import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Truck } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  apiError,
  businessMoney,
  businessService,
  Supplier,
} from "@/services/businessService";

const empty = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  status: "Active",
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const suppliers = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => businessService.getSuppliers(search),
  });
  const save = useMutation({
    mutationFn: () =>
      editing
        ? businessService.updateSupplier(editing.id, form)
        : businessService.createSupplier(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      setOpen(false);
      toast.success(editing ? "Supplier updated" : "Supplier added");
    },
    onError: (e) => toast.error(apiError(e, "Could not save the supplier.")),
  });
  const edit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      notes: s.notes ?? "",
      status: s.status,
    });
    setOpen(true);
  };
  const create = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader eyebrow="People you buy from" title="Suppliers" description="Keep contact details, purchases, payments, and what you still owe in one place." actions={<Button onClick={create}><Plus />Add supplier</Button>} />
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or email"
          />
        </div>
        {suppliers.isLoading ? (
          <LoadingState label="Opening your supplier list…" />
        ) : (suppliers.data ?? []).length === 0 ? (
          <EmptyState icon={Truck} title={search ? "No suppliers match that search" : "No suppliers yet"} description={search ? "Try a name, phone number, or email address." : "Add the people and businesses you buy from. Their balance will update automatically when you record purchases and payments."} action={!search && <Button onClick={create}>Add first supplier</Button>} />
        ) : (
          <div className="paper-card overflow-hidden">
            <div className="divide-y">
              {suppliers.data!.map((s) => (
                <div
                  key={s.id}
                  className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[s.phone, s.email].filter(Boolean).join(" · ") ||
                        "No contact details"}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p
                      className={
                        s.outstandingBalance > 0
                          ? "font-semibold text-amber-600"
                          : "font-semibold"
                      }
                    >
                      {businessMoney(s.outstandingBalance, s.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      owed · {s.purchaseCount} purchases
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => edit(s)}
                  >
                    <Pencil size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit supplier" : "Add supplier"}
            </DialogTitle>
            <DialogDescription>Keep supplier contact details and purchase balances together.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Name *</Label>
              <Input
                id="supplier-name"
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Phone</Label>
                <Input
                  id="supplier-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Input
                id="supplier-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-notes">Notes</Label>
              <Textarea
                id="supplier-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
