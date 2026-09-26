import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Plus, ReceiptText, Search, WalletCards } from "lucide-react";
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
  Sale,
} from "@/services/businessService";

type DraftItem = { productId: string; quantity: number; unitPrice: number };
const newItem = (): DraftItem => ({ productId: "", quantity: 1, unitPrice: 0 });

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(params.get("create") === "1");
  const [customerId, setCustomerId] = useState(params.get("customer") ?? "");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentChoice, setPaymentChoice] = useState<"paid" | "partial" | "unpaid">("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [payingSale, setPayingSale] = useState<Sale | null>(null);
  const [laterPayment, setLaterPayment] = useState(0);
  const [laterMethod, setLaterMethod] = useState("Cash");

  const { data: customers = [] } = useQuery({
    queryKey: ["business-customers", "active"],
    queryFn: () => businessService.getCustomers(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => businessService.getProducts("", true),
  });
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", search],
    queryFn: () => businessService.getSales(search),
  });
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );
  const currency = products[0]?.currency || customers[0]?.currency || "USD";

  const create = useMutation({
    mutationFn: () =>
      businessService.createSale({
        customerId,
        items,
        paymentAmount: paymentChoice === "paid" ? total : paymentChoice === "unpaid" ? 0 : paymentAmount,
        paymentMethod,
        notes: notes || undefined,
      }),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Sale recorded", { description: sale.outstandingBalance > 0 ? `${sale.customerName} now owes ${businessMoney(sale.outstandingBalance, sale.currency)}.` : `${sale.customerName} paid in full.` });
    },
    onError: (error) =>
      toast.error(apiError(error, "Could not record the sale.")),
  });
  const pay = useMutation({
    mutationFn: () =>
      businessService.recordPayment(payingSale!.id, {
        amount: laterPayment,
        method: laterMethod,
      }),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      setPayingSale(null);
      toast.success("Payment recorded", { description: sale.outstandingBalance > 0 ? `Remaining balance: ${businessMoney(sale.outstandingBalance, sale.currency)}.` : "This sale is now paid in full." });
    },
    onError: (error) =>
      toast.error(apiError(error, "Could not record the payment.")),
  });

  function resetForm() {
    setCustomerId("");
    setItems([newItem()]);
    setPaymentAmount(0);
    setPaymentChoice("unpaid");
    setPaymentMethod("Cash");
    setNotes("");
  }
  function chooseProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setItems(
      items.map((item, i) =>
        i === index
          ? { ...item, productId, unitPrice: product?.defaultPrice ?? 0 }
          : item,
      ),
    );
  }
  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!customerId || items.some((item) => !item.productId)) {
      toast.error("Choose a customer and product for every line.");
      return;
    }
    create.mutate();
  }
  function openPayment(sale: Sale) {
    setPayingSale(sale);
    setLaterPayment(sale.outstandingBalance);
    setLaterMethod("Cash");
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader eyebrow="Money coming in" title="Sales" description="Record what a customer bought and whether they paid. Tenvora keeps the running balance for you." actions={<Button onClick={() => setCreateOpen(true)}><Plus />New sale</Button>} />
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, product, or sale number"
            className="pl-9"
          />
        </div>
        {isLoading ? (
          <LoadingState label="Opening your sales book…" />
        ) : sales.length === 0 ? (
          <EmptyState icon={ReceiptText} title={search ? "No sales match that search" : "No sales yet"} description={search ? "Try a customer name, product, or sale number." : "Your sales will appear here after you record the first one. Add a customer and product first if you haven't already."} action={!search && <Button onClick={() => setCreateOpen(true)}>Record first sale</Button>} />
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <article key={sale.id} className="paper-card p-5 transition-colors hover:border-primary/25 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {sale.saleNumber}
                      </span>
                      <StatusPill status={sale.paymentStatus} />
                    </div>
                    <Link
                      to={`/customers/${sale.customerId}`}
                      className="mt-2 block text-lg font-semibold hover:text-primary"
                    >
                      {sale.customerName}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sale.items
                        .map(
                          (item) =>
                            `${item.quantity} ${item.unit} ${item.productName}`,
                        )
                        .join(" · ")}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(sale.soldAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xl font-semibold">
                      {businessMoney(sale.totalAmount, sale.currency)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Paid {businessMoney(sale.paidAmount, sale.currency)}
                    </p>
                    {sale.outstandingBalance > 0 && (
                      <>
                        <p className="mt-1 font-semibold text-amber-600">
                          Owed{" "}
                          {businessMoney(
                            sale.outstandingBalance,
                            sale.currency,
                          )}
                        </p>
                        <Button
                          className="mt-3"
                          size="sm"
                          variant="outline"
                          onClick={() => openPayment(sale)}
                        >
                          <WalletCards className="mr-2 h-4 w-4" />
                          Receive payment
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {sale.payments.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Payment history
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sale.payments.map((payment) => (
                        <span
                          key={payment.id}
                          className="rounded-lg bg-secondary px-3 py-2 text-xs"
                        >
                          {businessMoney(payment.amount, payment.currency)} ·{" "}
                          {payment.method} ·{" "}
                          {new Date(payment.paidAt).toLocaleDateString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><span className="notebook-label w-fit">Digital sales slip</span><DialogTitle className="mt-2">New sale</DialogTitle><DialogDescription>Just answer: who bought what, how much, and did they pay?</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label>Who bought it? *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customers.length === 0 && (
                <p className="text-xs text-amber-600">
                  Add a customer before recording a sale.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>What did they buy? *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setItems([...items, newItem()])}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add line
                </Button>
              </div>
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div
                    key={index}
                    className="grid gap-3 rounded-2xl border bg-background/35 p-4 sm:grid-cols-[1fr_110px_140px_auto]"
                  >
                    <Select
                      value={item.productId}
                      onValueChange={(value) => chooseProduct(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name} / {option.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div>
                      <Label className="sr-only">Quantity</Label>
                      <Input
                        aria-label="Quantity"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, {
                            quantity: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="sr-only">Unit price</Label>
                      <Input
                        aria-label="Unit price"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, {
                            unitPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== index))
                      }
                    >
                      <Minus size={16} />
                    </Button>
                    {product && (
                      <p className="text-xs text-muted-foreground sm:col-span-4">
                        {item.quantity} {product.unit} ×{" "}
                        {businessMoney(item.unitPrice, product.currency)} ={" "}
                        {businessMoney(
                          item.quantity * item.unitPrice,
                          product.currency,
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border bg-accent/55 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Total</span>
                <span className="tabular-nums text-2xl font-bold">
                  {businessMoney(total, currency)}
                </span>
              </div>
            </div>
            <fieldset className="space-y-3"><legend className="text-sm font-bold">Did they pay?</legend><div className="grid gap-2 sm:grid-cols-3">{([
              ["paid", "Paid in full"], ["partial", "Partly paid"], ["unpaid", "Not paid yet"],
            ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setPaymentChoice(value); if (value === "unpaid") setPaymentAmount(0); }} className={`friendly-focus flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors ${paymentChoice === value ? "border-primary bg-accent text-primary" : "bg-card hover:bg-secondary"}`}>{paymentChoice === value && <Check size={16} />}{label}</button>)}</div></fieldset>
            {paymentChoice === "partial" && <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="initial-payment">How much did they pay?</Label>
                <Input
                  id="initial-payment"
                  type="number"
                  min="0"
                  max={total}
                  step="0.0001"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  They will still owe:{" "}
                  {businessMoney(Math.max(0, total - paymentAmount), currency)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div></div>}
            {paymentChoice === "paid" && <p className="rounded-xl bg-[hsl(var(--success)/.1)] p-3 text-sm font-bold text-[hsl(var(--success))]">Paid in full: {businessMoney(total, currency)}</p>}
            <div className="space-y-2">
              <Label htmlFor="sale-notes">Anything else to remember? <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="sale-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  create.isPending ||
                  customers.length === 0 ||
                  products.length === 0
                }
              >
                {create.isPending ? "Saving the sale…" : "Save sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!payingSale}
        onOpenChange={(open) => !open && setPayingSale(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive payment</DialogTitle>
            <DialogDescription>Add a payment without replacing the existing payment history.</DialogDescription>
          </DialogHeader>
          {payingSale && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                pay.mutate();
              }}
              className="space-y-4"
            >
              <div className="rounded-xl bg-secondary/60 p-4">
                <p className="font-semibold">{payingSale.customerName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Outstanding{" "}
                  {businessMoney(
                    payingSale.outstandingBalance,
                    payingSale.currency,
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount *</Label>
                <Input
                  id="payment-amount"
                  autoFocus
                  required
                  type="number"
                  min="0.0001"
                  max={payingSale.outstandingBalance}
                  step="0.0001"
                  value={laterPayment}
                  onChange={(e) => setLaterPayment(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={laterMethod} onValueChange={setLaterMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayingSale(null)}
                >
                  Cancel
                </Button>
                <Button disabled={pay.isPending}>
                  {pay.isPending ? "Recording…" : "Record payment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
