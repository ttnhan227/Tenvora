import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Download,
  FileUp,
  Minus,
  PackageOpen,
  PackagePlus,
  Plus,
  Search,
  Truck,
  Undo2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader, PrerequisiteNotice, StatusPill } from "@/components/business/BusinessUI";
import { PaginationBar } from "@/components/business/PaginationBar";
import { PaymentReversalModal } from "@/components/business/PaymentReversalModal";
import { RecordImageField } from "@/components/business/RecordImageField";
import { VoidDocumentModal } from "@/components/business/VoidDocumentModal";
import { exportToCsv } from "@/lib/csvExport";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessPermissions } from "@/hooks/useBusinessPermissions";

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
  const { isVietnamese, t } = useLanguage();
  const { canManageRecords } = useBusinessPermissions();
  const methodLabel = (value: string) => isVietnamese ? ({ Cash: "Tiền mặt", "Bank transfer": "Chuyển khoản", Card: "Thẻ", Other: "Khác" }[value] ?? value) : value;
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [open, setOpen] = useState(canManageRecords && params.get("create") === "1");
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<Line[]>([line()]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [invoiceImageDataUrl, setInvoiceImageDataUrl] = useState<string | undefined>();
  const [paying, setPaying] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  // Reversal & Void state
  const [reversingPayment, setReversingPayment] = useState<{
    purchaseId: string;
    paymentId: string;
    amount: number;
    currency: string;
    method: string;
    purchaseNumber: string;
  } | null>(null);
  const [voidingPurchase, setVoidingPurchase] = useState<Purchase | null>(null);

  const suppliers = useQuery({
    queryKey: ["suppliers", "active"],
    queryFn: () => businessService.getSuppliers(),
  });
  const products = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => businessService.getProducts("", true),
  });
  const purchases = useQuery({
    queryKey: ["purchases-paged", search, page],
    queryFn: () => businessService.getPurchasesPaged(search, undefined, undefined, undefined, page, pageSize),
  });
  const purchaseItems = purchases.data?.items ?? [];
  const totalCount = purchases.data?.totalCount ?? 0;

  const total = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.unitCost, 0),
    [items],
  );
  const currency = suppliers.data?.[0]?.currency ?? "USD";
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["purchases-paged"] }),
      qc.invalidateQueries({ queryKey: ["purchases"] }),
      qc.invalidateQueries({ queryKey: ["suppliers"] }),
      qc.invalidateQueries({ queryKey: ["products"] }),
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
        invoiceImageDataUrl,
      }),
    onSuccess: async (p) => {
      await refresh();
      setOpen(false);
      setSupplierId("");
      setItems([line()]);
      setPaymentAmount(0);
      setNotes("");
      setInvoiceImageDataUrl(undefined);
      toast.success(isVietnamese ? `Đã ghi ${p.purchaseNumber}` : `${p.purchaseNumber} recorded`);
    },
    onError: (e) => toast.error(apiError(e, isVietnamese ? "Không thể ghi lần nhập hàng." : "Could not record the purchase.")),
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
      toast.success(isVietnamese ? "Đã ghi thanh toán cho nhà cung cấp" : "Supplier payment recorded");
    },
    onError: (e) => toast.error(apiError(e, isVietnamese ? "Không thể ghi khoản thanh toán." : "Could not record the payment.")),
  });
  const patchLine = (i: number, p: Partial<Line>) =>
    setItems(items.map((v, x) => (x === i ? { ...v, ...p } : v)));

  const handleExportCsv = () => {
    if (purchaseItems.length === 0) return;
    exportToCsv(
      `purchases-${new Date().toISOString().split("T")[0]}`,
      [
        { header: isVietnamese ? "Mã nhập hàng" : "Purchase Number", accessor: (p) => p.purchaseNumber },
        { header: isVietnamese ? "Nhà cung cấp" : "Supplier", accessor: (p) => p.supplierName },
        { header: isVietnamese ? "Thời gian" : "Purchased At", accessor: (p) => new Date(p.purchasedAt).toLocaleString() },
        { header: isVietnamese ? "Mặt hàng" : "Items", accessor: (p) => p.items.map((i) => `${i.description} (${i.quantity} ${i.unit})`).join("; ") },
        { header: isVietnamese ? "Tổng tiền" : "Total Amount", accessor: (p) => p.totalAmount },
        { header: isVietnamese ? "Đã trả" : "Paid Amount", accessor: (p) => p.paidAmount },
        { header: isVietnamese ? "Còn nợ" : "Outstanding Balance", accessor: (p) => p.outstandingBalance },
        { header: isVietnamese ? "Trạng thái thanh toán" : "Payment Status", accessor: (p) => p.paymentStatus },
      ],
      purchaseItems
    );
  };

  const handleReversePayment = async (reason: string) => {
    if (!reversingPayment) return;
    await businessService.reversePurchasePayment(reversingPayment.purchaseId, reversingPayment.paymentId, reason);
    await refresh();
  };

  const handleVoidPurchase = async (options: { reversePayments: boolean; reason?: string }) => {
    if (!voidingPurchase) return;
    await businessService.voidPurchase(voidingPurchase.id, options);
    await refresh();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isVietnamese ? "Hàng doanh nghiệp đã mua" : "What the business bought"}
          title={t("nav.purchases")}
          description={isVietnamese ? "Ghi hàng hoá hoặc dịch vụ mua từ nhà cung cấp và các khoản thanh toán đi kèm." : "Record goods or services bought from suppliers and keep every payment with the purchase."}
          actions={
            <div className="flex flex-wrap gap-2">
              {canManageRecords && <Button asChild variant="outline" className="gap-2"><Link to="/imports?type=purchases"><FileUp className="h-4 w-4" />{isVietnamese ? "Nhập hóa đơn" : "Import bills"}</Link></Button>}
              {purchaseItems.length > 0 && (
                <Button variant="outline" onClick={handleExportCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isVietnamese ? "Xuất CSV" : "Export CSV"}
                </Button>
              )}
              {canManageRecords && (
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {isVietnamese ? "Nhập hàng mới" : "New purchase"}
                </Button>
              )}
            </div>
          }
        />
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={isVietnamese ? "Tìm nhà cung cấp, mặt hàng hoặc mã nhập" : "Search supplier, item, or purchase number"}
          />
        </div>
        {purchases.isLoading ? (
          <LoadingState label={isVietnamese ? "Đang mở sổ nhập hàng…" : "Opening your purchase records…"} />
        ) : purchaseItems.length === 0 ? (
          <EmptyState icon={PackageOpen} title={search ? (isVietnamese ? "Không tìm thấy lần nhập phù hợp" : "No purchases match that search") : (isVietnamese ? "Chưa có lần nhập hàng" : "No purchases yet")} description={search ? (isVietnamese ? "Hãy thử nhà cung cấp, mặt hàng hoặc mã nhập khác." : "Try a supplier, item, or purchase number.") : (isVietnamese ? "Thêm nhà cung cấp, sau đó ghi hàng đã mua và tình trạng thanh toán." : "Add a supplier first, then record what the business bought and whether it was paid.")} action={!search && canManageRecords ? <Button onClick={() => setOpen(true)}>{isVietnamese ? "Ghi lần nhập đầu tiên" : "Record first purchase"}</Button> : undefined} />
        ) : (
          <div className="space-y-4">
            <div className="paper-card divide-y overflow-hidden">
              {purchaseItems.map((p) => {
                const isVoided = p.status === "Voided";
                return (
                  <article
                    key={p.id}
                    className={`relative p-5 transition-colors before:absolute before:inset-y-0 before:left-0 before:w-1 sm:p-6 sm:pl-8 ${
                      isVoided ? "opacity-60 bg-muted/20 before:bg-muted-foreground/30" : "hover:bg-muted/15 before:bg-sky-500/60"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div className="flex min-w-0 gap-4">
                        {p.invoiceImageDataUrl && (
                          <a href={p.invoiceImageDataUrl} target="_blank" rel="noreferrer" className="friendly-focus block h-20 w-16 shrink-0 overflow-hidden rounded-lg border bg-card" aria-label={isVietnamese ? "Mở ảnh hoá đơn" : "Open invoice image"}>
                            <img src={p.invoiceImageDataUrl} alt="" className="h-full w-full object-cover" />
                          </a>
                        )}
                        <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-muted-foreground">{p.purchaseNumber}</p>
                          <StatusPill status={p.paymentStatus} />
                        </div>
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
                      </div>
                      <div className="sm:text-right">
                        <p className={`text-xl font-semibold ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                          {businessMoney(p.totalAmount, p.currency)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isVietnamese ? "Đã trả" : "Paid"} {businessMoney(p.paidAmount, p.currency)}
                        </p>
                        {p.outstandingBalance > 0 && !isVoided && (
                          <p className="mt-1 font-semibold text-amber-600">
                            {isVietnamese ? "Còn nợ" : "Owed"} {businessMoney(p.outstandingBalance, p.currency)}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 justify-end">
                          {canManageRecords && p.outstandingBalance > 0 && !isVoided && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPaying(p);
                                setPayAmount(p.outstandingBalance);
                              }}
                            >
                              <WalletCards className="mr-2 h-4 w-4" />
                              {isVietnamese ? "Trả nhà cung cấp" : "Pay supplier"}
                            </Button>
                          )}
                          {canManageRecords && !isVoided && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setVoidingPurchase(p)}
                              className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Ban className="h-4 w-4" />
                              {isVietnamese ? "Hủy đơn" : "Void"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {p.payments && p.payments.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {isVietnamese ? "Lịch sử thanh toán" : "Payment history"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {p.payments.map((payment) => (
                            <span
                              key={payment.id}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${
                                payment.isReversed
                                  ? "bg-destructive/10 text-muted-foreground line-through"
                                  : "bg-secondary"
                              }`}
                            >
                              <span>
                                {businessMoney(payment.amount, payment.currency)} ·{" "}
                                {methodLabel(payment.method)} ·{" "}
                                {new Date(payment.paidAt).toLocaleDateString()}
                              </span>
                              {payment.isReversed ? (
                                <span className="no-underline rounded bg-destructive/20 px-1 py-0.5 text-[10px] font-semibold text-destructive">
                                  {isVietnamese ? "Đã hoàn tác" : "Reversed"}
                                </span>
                              ) : canManageRecords && !isVoided ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReversingPayment({
                                      purchaseId: p.id,
                                      paymentId: payment.id,
                                      amount: payment.amount,
                                      currency: payment.currency,
                                      method: payment.method,
                                      purchaseNumber: p.purchaseNumber,
                                    })
                                  }
                                  title={isVietnamese ? "Hoàn tác thanh toán này" : "Reverse this payment"}
                                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Undo2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isVietnamese ? "Nhập hàng mới" : "New purchase"}</DialogTitle>
            <DialogDescription>{isVietnamese ? "Ghi mặt hàng đã mua, chi phí và số tiền thanh toán ngay." : "Record what was bought, its cost, and any payment made now."}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!supplierId || items.some((i) => !i.description || !i.unit)) {
                toast.error(isVietnamese ? "Hãy chọn nhà cung cấp và điền đủ từng dòng." : "Choose a supplier and complete each line.");
                return;
              }
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>{isVietnamese ? "Nhà cung cấp" : "Supplier"} *</Label>
              {(suppliers.data?.length ?? 0) === 0 ? (
                <PrerequisiteNotice
                  icon={Truck}
                  title={isVietnamese ? "Chưa có nhà cung cấp để chọn" : "No suppliers available"}
                  description={isVietnamese ? "Thêm nhà cung cấp đầu tiên, sau đó bạn sẽ quay lại lần nhập hàng này." : "Create your first supplier, then return directly to this purchase."}
                  action={<Button type="button" asChild><Link to="/suppliers?create=1&returnTo=%2Fpurchases%3Fcreate%3D1"><Plus />{isVietnamese ? "Thêm nhà cung cấp" : "Create supplier"}</Link></Button>}
                />
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder={isVietnamese ? "Chọn nhà cung cấp" : "Choose a supplier"} /></SelectTrigger>
                    <SelectContent>{suppliers.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="outline" asChild><Link to="/suppliers?create=1&returnTo=%2Fpurchases%3Fcreate%3D1"><Plus />{isVietnamese ? "NCC mới" : "New supplier"}</Link></Button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{isVietnamese ? "Mặt hàng" : "Items"} *</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" asChild><Link to="/products?create=1&returnTo=%2Fpurchases%3Fcreate%3D1"><Plus className="mr-1 h-3 w-3" />{isVietnamese ? "Hàng mới" : "New product"}</Link></Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, line()])}><Plus className="mr-1 h-3 w-3" />{isVietnamese ? "Thêm dòng" : "Add line"}</Button>
                </div>
              </div>
              {(products.data?.length ?? 0) === 0 && <PrerequisiteNotice
                icon={PackagePlus}
                title={isVietnamese ? "Chưa có hàng hoá để liên kết" : "No products to link yet"}
                description={isVietnamese ? "Bạn vẫn có thể nhập mô tả thủ công, hoặc tạo hàng hoá để tái sử dụng sau này." : "You can enter an item manually, or create a reusable product now."}
                action={<Button type="button" variant="outline" asChild><Link to="/products?create=1&returnTo=%2Fpurchases%3Fcreate%3D1"><Plus />{isVietnamese ? "Thêm hàng hoá" : "Create product"}</Link></Button>}
              />}
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_90px_100px_130px_auto]"
                >
                  <Input
                    aria-label={isVietnamese ? "Mô tả mặt hàng" : "Item description"}
                    placeholder={isVietnamese ? "Mặt hàng" : "Item"}
                    value={it.description}
                    onChange={(e) =>
                      patchLine(i, { description: e.target.value })
                    }
                  />
                  <Input
                    aria-label={isVietnamese ? "Đơn vị" : "Unit"}
                    placeholder={isVietnamese ? "Đơn vị" : "Unit"}
                    value={it.unit}
                    onChange={(e) => patchLine(i, { unit: e.target.value })}
                  />
                  <Input
                    aria-label={isVietnamese ? "Số lượng" : "Quantity"}
                    type="number"
                    min=".0001"
                    step="any"
                    value={it.quantity === 0 ? "" : it.quantity}
                    onChange={(e) =>
                      patchLine(i, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })
                    }
                  />
                  <Input
                    aria-label={isVietnamese ? "Đơn giá" : "Unit cost"}
                    type="number"
                    min="0"
                    step="any"
                    value={it.unitCost === 0 ? "" : it.unitCost}
                    onChange={(e) =>
                      patchLine(i, { unitCost: e.target.value === "" ? 0 : Number(e.target.value) })
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
                  {(products.data?.length ?? 0) > 0 && <div className="sm:col-span-5">
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
                        <SelectValue placeholder={isVietnamese ? "Liên kết hàng hoá (không bắt buộc)" : "Link product (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{isVietnamese ? "Không liên kết hàng hoá" : "No linked product"}</SelectItem>
                        {products.data?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>}
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-secondary/60 p-4 flex justify-between">
              <span>{isVietnamese ? "Tổng tiền nhập" : "Purchase total"}</span>
              <strong>{businessMoney(total, currency)}</strong>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchase-paid">{isVietnamese ? "Trả ngay" : "Paid now"}</Label>
                <Input
                  id="purchase-paid"
                  type="number"
                  min="0"
                  max={total}
                  step="any"
                  value={paymentAmount === 0 ? "" : paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>{isVietnamese ? "Phương thức" : "Method"}</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Cash", "Bank transfer", "Card", "Other"].map((x) => (
                      <SelectItem key={x} value={x}>
                        {methodLabel(x)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-notes">{isVietnamese ? "Ghi chú" : "Notes"}</Label>
              <Textarea
                id="purchase-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <RecordImageField
              label={isVietnamese ? "Ảnh hoá đơn nhà cung cấp" : "Supplier invoice image"}
              helpText={isVietnamese ? "Chụp hoặc chọn hoá đơn giấy để lưu cùng lần nhập hàng." : "Take or choose a paper invoice to keep with this purchase."}
              value={invoiceImageDataUrl}
              onChange={(value) => setInvoiceImageDataUrl(value)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button disabled={create.isPending || !suppliers.data?.length}>
                {create.isPending ? (isVietnamese ? "Đang ghi…" : "Recording…") : (isVietnamese ? "Ghi lần nhập" : "Record purchase")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!paying} onOpenChange={(v) => !v && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isVietnamese ? "Trả nhà cung cấp" : "Pay supplier"}</DialogTitle>
            <DialogDescription>{isVietnamese ? "Thêm khoản thanh toán vào số dư của lần nhập này." : "Add a payment against this purchase balance."}</DialogDescription>
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
                  {isVietnamese ? "Còn nợ" : "Outstanding"}{" "}
                  {businessMoney(paying.outstandingBalance, paying.currency)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment">{isVietnamese ? "Số tiền" : "Amount"} *</Label>
                <Input
                  id="supplier-payment"
                  type="number"
                  required
                  min=".0001"
                  max={paying.outstandingBalance}
                  step="any"
                  value={payAmount === 0 ? "" : payAmount}
                  onChange={(e) => setPayAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaying(null)}
                >
                  {t("common.cancel")}
                </Button>
                <Button disabled={pay.isPending}>{isVietnamese ? "Ghi thanh toán" : "Record payment"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {reversingPayment && (
        <PaymentReversalModal
          open={!!reversingPayment}
          onOpenChange={(open) => !open && setReversingPayment(null)}
          paymentId={reversingPayment.paymentId}
          paymentAmount={reversingPayment.amount}
          paymentCurrency={reversingPayment.currency}
          paymentMethod={reversingPayment.method}
          referenceDocNumber={reversingPayment.purchaseNumber}
          onConfirm={handleReversePayment}
        />
      )}
      {voidingPurchase && (
        <VoidDocumentModal
          open={!!voidingPurchase}
          onOpenChange={(open) => !open && setVoidingPurchase(null)}
          documentType="purchase"
          documentNumber={voidingPurchase.purchaseNumber}
          totalAmountFormatted={businessMoney(voidingPurchase.totalAmount, voidingPurchase.currency)}
          hasPayments={!!voidingPurchase.payments?.some((p) => !p.isReversed)}
          onConfirm={handleVoidPurchase}
        />
      )}
    </DashboardLayout>
  );
}
