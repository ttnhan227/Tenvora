import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, MapPin, Phone, Plus, ReceiptText, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, MoneyCard, StatusPill } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiError, businessMoney, businessService, Sale } from "@/services/businessService";

export default function CustomerDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [sale, setSale] = useState<Sale | null>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const query = useQuery({ queryKey: ["business-customer", id], queryFn: () => businessService.getCustomer(id), enabled: !!id });
  const payment = useMutation({
    mutationFn: () => businessService.recordPayment(sale!.id, { amount, method }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["business-customer", id] });
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setSale(null);
      toast.success("Payment recorded", { description: updated.outstandingBalance > 0 ? `Remaining balance: ${businessMoney(updated.outstandingBalance, updated.currency)}.` : "This sale is now paid in full." });
    },
    onError: (error) => toast.error(apiError(error, "Could not record payment.")),
  });
  const openPayment = (selected: Sale) => { setSale(selected); setAmount(selected.outstandingBalance); setMethod("Cash"); };

  if (query.isLoading) return <DashboardLayout><LoadingState label="Opening this customer's record…" /></DashboardLayout>;
  if (!query.data) return <DashboardLayout><EmptyState icon={ReceiptText} title="Customer not found" description="This customer may have been removed or the link may be incorrect." action={<Button asChild variant="outline"><Link to="/customers">Back to customers</Link></Button>} /></DashboardLayout>;
  const { customer, sales } = query.data;

  return <DashboardLayout><div className="space-y-7">
    <Button asChild variant="ghost" className="-ml-3"><Link to="/customers"><ArrowLeft />Customers</Link></Button>
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><span className="notebook-label">Customer record</span><h1 className="page-title mt-3">{customer.name}</h1><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{customer.phone && <span className="inline-flex items-center gap-2"><Phone size={15} />{customer.phone}</span>}{customer.email && <span className="inline-flex items-center gap-2"><Mail size={15} />{customer.email}</span>}{customer.address && <span className="inline-flex items-center gap-2"><MapPin size={15} />{customer.address}</span>}</div></div><Button asChild><Link to={`/sales?create=1&customer=${customer.id}`}><Plus />New sale</Link></Button></header>

    <section className="grid gap-4 sm:grid-cols-3"><MoneyCard label="Current balance" value={businessMoney(customer.outstandingBalance, customer.currency)} detail={customer.outstandingBalance > 0 ? "Still to collect" : "Nothing outstanding"} icon={WalletCards} tone={customer.outstandingBalance > 0 ? "attention" : "good"} /><MoneyCard label="Total sales" value={businessMoney(customer.totalSales, customer.currency)} detail={`${customer.salesCount} recorded sale${customer.salesCount === 1 ? "" : "s"}`} icon={ReceiptText} /><MoneyCard label="Money received" value={businessMoney(customer.totalPaid, customer.currency)} detail="Across all payments" icon={WalletCards} tone="good" /></section>

    <section><div className="mb-4"><h2 className="text-xl font-bold">Sales and payments</h2><p className="mt-1 text-sm text-muted-foreground">Newest records first, like a clear running notebook.</p></div>
      {sales.length === 0 ? <EmptyState compact icon={ReceiptText} title="No sales for this customer" description="Their sales and payments will appear here." action={<Button asChild><Link to={`/sales?create=1&customer=${customer.id}`}>Record a sale</Link></Button>} /> : <div className="relative space-y-4 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-border sm:before:left-6">{sales.map((entry) => <article key={entry.id} className="paper-card relative ml-10 p-5 sm:ml-12 sm:p-6"><span className="absolute -left-[2.68rem] top-5 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground sm:-left-[3.17rem]"><ReceiptText size={13} /></span><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-muted-foreground">{entry.saleNumber}</p><StatusPill status={entry.paymentStatus} /></div><p className="mt-3 font-bold">{entry.items.map((item) => `${item.quantity} ${item.unit} ${item.productName}`).join(" · ")}</p><p className="mt-2 text-sm text-muted-foreground">{new Date(entry.soldAt).toLocaleString()}</p></div><div className="sm:text-right"><p className="tabular-nums text-xl font-bold">{businessMoney(entry.totalAmount, entry.currency)}</p><p className="mt-1 text-sm text-muted-foreground">Received {businessMoney(entry.paidAmount, entry.currency)}</p>{entry.outstandingBalance > 0 && <Button className="mt-3" size="sm" variant="outline" onClick={() => openPayment(entry)}><WalletCards />Receive payment</Button>}</div></div>
        {entry.payments.length > 0 && <div className="mt-5 rounded-xl bg-secondary/55 p-4"><p className="micro-label">Payments received</p><div className="mt-2 divide-y">{entry.payments.map((item) => <div key={item.id} className="flex justify-between gap-3 py-2 text-sm"><span className="text-muted-foreground">{new Date(item.paidAt).toLocaleDateString()} · {item.method}</span><span className="tabular-nums font-bold">{businessMoney(item.amount, item.currency)}</span></div>)}</div></div>}
      </article>)}</div>}
    </section>
  </div>

  <Dialog open={!!sale} onOpenChange={(open) => !open && setSale(null)}><DialogContent className="sm:max-w-md"><DialogHeader><span className="notebook-label w-fit">Payment receipt</span><DialogTitle className="mt-2">Receive payment from {customer.name}</DialogTitle><DialogDescription>Record the amount received. Tenvora will update the remaining balance.</DialogDescription></DialogHeader>{sale && <form onSubmit={(event: FormEvent) => { event.preventDefault(); payment.mutate(); }} className="space-y-5"><div className="rounded-2xl border bg-[hsl(var(--warning)/.1)] p-4 text-sm"><p className="text-muted-foreground">Currently owed for {sale.saleNumber}</p><strong className="mt-1 block text-xl">{businessMoney(sale.outstandingBalance, sale.currency)}</strong></div><div className="space-y-2"><Label htmlFor="customer-payment">How much did they pay? *</Label><Input id="customer-payment" autoFocus required type="number" min="0.0001" max={sale.outstandingBalance} step="0.0001" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div><div className="space-y-2"><Label>How did they pay?</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank transfer">Bank transfer</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div><DialogFooter><Button type="button" variant="outline" onClick={() => setSale(null)}>Cancel</Button><Button disabled={payment.isPending}>{payment.isPending ? "Saving payment…" : "Save payment"}</Button></DialogFooter></form>}</DialogContent></Dialog>
  </DashboardLayout>;
}
