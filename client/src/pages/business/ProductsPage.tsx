import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiError, businessMoney, businessService, Product, ProductInput } from "@/services/businessService";

const emptyProduct: ProductInput = { name: "", sku: "", unit: "item", defaultPrice: 0, notes: "", isActive: true };

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyProduct);
  const { data = [], isLoading } = useQuery({ queryKey: ["products", search], queryFn: () => businessService.getProducts(search, undefined) });
  const save = useMutation({
    mutationFn: () => editing ? businessService.updateProduct(editing.id, form) : businessService.createProduct(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setDialogOpen(false); toast.success(editing ? "Product updated" : "Product added"); },
    onError: (error) => toast.error(apiError(error, "Could not save the product.")),
  });
  const openCreate = () => { setEditing(null); setForm(emptyProduct); setDialogOpen(true); };
  const openEdit = (product: Product) => { setEditing(product); setForm({ name: product.name, sku: product.sku ?? "", unit: product.unit, defaultPrice: product.defaultPrice, notes: product.notes ?? "", isActive: product.isActive }); setDialogOpen(true); };
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader eyebrow="What you sell" title="Products & services" description="Save the usual unit and price once, then reuse it whenever you record a sale." actions={<Button onClick={openCreate}><Plus />Add product</Button>} />
        <div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, services, or SKU" className="pl-9" /></div>
        {isLoading ? <LoadingState label="Opening your product list…" /> : data.length === 0 ? <EmptyState icon={Package} title={search ? "No products match that search" : "What does your business sell?"} description={search ? "Try the product name or code." : "Add your products or services with their usual unit and price. You can still change the price during a sale."} action={!search && <Button onClick={openCreate}>Add first product</Button>} /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((product) => <article key={product.id} className={`paper-card p-5 transition-colors hover:border-primary/25 ${!product.isActive ? "opacity-60" : ""}`}><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{product.name}</h2><p className="mt-1 text-xs text-muted-foreground">{product.sku || "No product code"} · per {product.unit}</p></div><Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label={`Edit ${product.name}`}><Pencil size={16} /></Button></div><p className="tabular-nums mt-6 text-2xl font-bold">{businessMoney(product.defaultPrice, product.currency)}</p><p className="mt-1 text-xs text-muted-foreground">usual price per {product.unit}</p>{!product.isActive && <p className="mt-4 text-xs font-bold text-amber-700">Not currently available</p>}</article>)}</div>
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit product or service" : "Add product or service"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="product-name">Name *</Label><Input id="product-name" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Delivery service" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="product-unit">Unit *</Label><Input id="product-unit" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, item, hour…" /></div><div className="space-y-2"><Label htmlFor="product-price">Default price *</Label><Input id="product-price" required type="number" min="0" step="0.0001" value={form.defaultPrice} onChange={(e) => setForm({ ...form, defaultPrice: Number(e.target.value) })} /></div></div><div className="space-y-2"><Label htmlFor="product-sku">SKU or code</Label><Input id="product-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="product-notes">Notes</Label><Textarea id="product-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>{editing && <label className="flex items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Available for new sales</label>}<DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save product"}</Button></DialogFooter></form></DialogContent></Dialog>
    </DashboardLayout>
  );
}
