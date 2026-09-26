import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, PackageOpen, Plus, Search, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader, StatusPill } from "@/components/business/BusinessUI";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  apiError,
  businessMoney,
  businessService,
  Purchase,
} from "@/services/businessService";

type Line = {
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  productId?: string;
};
const line = (): Line => ({
  description: "",
  unit: "item",
  quantity: 1,
  unitCost: 0,
});
export default function PurchasesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<Line[]>([line()]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const suppliers = useQuery({
    queryKey: ["suppliers", "active"],
    queryFn: () => businessService.getSuppliers(),
  });
  const products = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => businessService.getProducts("", true),
  });
  const purchases = useQuery({
    queryKey: ["purchases", search],
    queryFn: () => businessService.getPurchases(search),
  });
  const total = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.unitCost, 0),
    [items],
  );
  const currency = suppliers.data?.[0]?.currency ?? "USD";
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["purchases"] }),
      qc.invalidateQueries({ queryKey: ["suppliers"] }),
      qc.invalidateQueries({ queryKey: ["business-dashboard"] }),
    ]);
  const create = useMutation({
    mutationFn: () =>
      businessService.createPurchase({
        supplierId,
        items,
        paymentAmount,
        paymentMethod: method,
        notes: notes || undefined,
      }),
    onSuccess: async (p) => {
      await refresh();
      setOpen(false);
      setSupplierId("");
      setItems([line()]);
      setPaymentAmount(0);
      setNotes("");
      toast.success(`${p.purchaseNumber} recorded`);
    },
    onError: (e) => toast.error(apiError(e, "Could not record the purchase.")),
  });
  const pay = useMutation({
    mutationFn: () =>
      businessService.recordPurchasePayment(paying!.id, {
        amount: payAmount,
        method,
      }),
    onSuccess: async () => {
      await refresh();
      setPaying(null);
      toast.success("Supplier payment recorded");
    },
    onError: (e) => toast.error(apiError(e, "Could not record the payment.")),
  });
  const patchLine = (i: number, p: Partial<Line>) =>
    setItems(items.map((v, x) => (x === i ? { ...v, ...p } : v)));
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader eyebrow="What the business bought" title="Purchases" description="Record goods or services bought from suppliers and keep every payment with the purchase." actions={<Button onClick={() => setOpen(true)}><Plus />New purchase</Button>} />
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier, item, or purchase number"
          />
        </div>
        {purchases.isLoading ? (
          <LoadingState label="Opening your purchase records…" />
        ) : (purchases.data ?? []).length === 0 ? (
          <EmptyState icon={PackageOpen} title={search ? "No purchases match that search" : "No purchases yet"} description={search ? "Try a supplier, item, or purchase number." : "Add a supplier first, then record what the business bought and whether it was paid."} action={!search && <Button onClick={() => setOpen(true)}>Record first purchase</Button>} />
        ) : (
          <div className="space-y-3">
            {purchases.data!.map((p) => (
              <article key={p.id} className="paper-card p-5 transition-colors hover:border-primary/25 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <div className="flex items-center gap-2"><p className="text-xs font-semibold text-muted-foreground">{p.purchaseNumber}</p><StatusPill status={p.paymentStatus} /></div>
                    <h2 className="mt-2 text-lg font-semibold">
                      {p.supplierName}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.items
                        .map((i) => `${i.quantity} ${i.unit} ${i.description}`)
                        .join(" · ")}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(p.purchasedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xl font-semibold">
                      {businessMoney(p.totalAmount, p.currency)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Paid {businessMoney(p.paidAmount, p.currency)}
                    </p>
                    {p.outstandingBalance > 0 && (
                      <>
                        <p className="mt-1 font-semibold text-amber-600">
                          Owed {businessMoney(p.outstandingBalance, p.currency)}
                        </p>
                        <Button
                          className="mt-3"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPaying(p);
                            setPayAmount(p.outstandingBalance);
                          }}
                        >
                          <WalletCards className="mr-2 h-4 w-4" />
                          Pay supplier
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New purchase</DialogTitle>
            <DialogDescription>Record what was bought, its cost, and any payment made now.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!supplierId || items.some((i) => !i.description || !i.unit)) {
                toast.error("Choose a supplier and complete each line.");
                return;
              }
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.data?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setItems([...items, line()])}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add line
                </Button>
              </div>
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_90px_100px_130px_auto]"
                >
                  <Input
                    aria-label="Item description"
                    placeholder="Item"
                    value={it.description}
                    onChange={(e) =>
                      patchLine(i, { description: e.target.value })
                    }
                  />
                  <Input
                    aria-label="Unit"
                    placeholder="Unit"
                    value={it.unit}
                    onChange={(e) => patchLine(i, { unit: e.target.value })}
                  />
                  <Input
                    aria-label="Quantity"
                    type="number"
                    min=".0001"
                    step=".0001"
                    value={it.quantity}
                    onChange={(e) =>
                      patchLine(i, { quantity: Number(e.target.value) })
                    }
                  />
                  <Input
                    aria-label="Unit cost"
                    type="number"
                    min="0"
                    step=".0001"
                    value={it.unitCost}
                    onChange={(e) =>
                      patchLine(i, { unitCost: Number(e.target.value) })
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    onClick={() => setItems(items.filter((_, x) => x !== i))}
                  >
                    <Minus size={16} />
                  </Button>
                  <div className="sm:col-span-5">
                    <Select
                      value={it.productId ?? "none"}
                      onValueChange={(v) => {
                        const p = products.data?.find((x) => x.id === v);
                        patchLine(
                          i,
                          v === "none"
                            ? { productId: undefined }
                            : {
                                productId: v,
                                description: p?.name ?? it.description,
                                unit: p?.unit ?? it.unit,
                              },
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Link product (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No linked product</SelectItem>
                        {products.data?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-secondary/60 p-4 flex justify-between">
              <span>Purchase total</span>
              <strong>{businessMoney(total, currency)}</strong>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchase-paid">Paid now</Label>
                <Input
                  id="purchase-paid"
                  type="number"
                  min="0"
                  max={total}
                  step=".0001"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Cash", "Bank transfer", "Card", "Other"].map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-notes">Notes</Label>
              <Textarea
                id="purchase-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              <Button disabled={create.isPending || !suppliers.data?.length}>
                {create.isPending ? "Recording…" : "Record purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!paying} onOpenChange={(v) => !v && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay supplier</DialogTitle>
            <DialogDescription>Add a payment against this purchase balance.</DialogDescription>
          </DialogHeader>
          {paying && (
            <form
              className="space-y-4"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                pay.mutate();
              }}
            >
              <div className="rounded-xl bg-secondary/60 p-4">
                <p className="font-semibold">{paying.supplierName}</p>
                <p className="text-sm text-muted-foreground">
                  Outstanding{" "}
                  {businessMoney(paying.outstandingBalance, paying.currency)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment">Amount *</Label>
                <Input
                  id="supplier-payment"
                  type="number"
                  required
                  min=".0001"
                  max={paying.outstandingBalance}
                  step=".0001"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaying(null)}
                >
                  Cancel
                </Button>
                <Button disabled={pay.isPending}>Record payment</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
