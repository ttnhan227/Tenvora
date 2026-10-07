import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Barcode,
  Check,
  Clock,
  Download,
  FileUp,
  Minus,
  PackagePlus,
  PauseCircle,
  PlayCircle,
  Plus,
  Printer,
  ReceiptText,
  ScanBarcode,
  Search,
  Trash2,
  Undo2,
  UserPlus,
  WalletCards,
  X,
  Zap,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { QueryErrorState } from "@/components/business/QueryErrorState";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader, PrerequisiteNotice, StatusPill } from "@/components/business/BusinessUI";
import { PaginationBar } from "@/components/business/PaginationBar";
import { PaymentReversalModal } from "@/components/business/PaymentReversalModal";
import { ReceiptModal } from "@/components/business/ReceiptModal";
import { VoidDocumentModal } from "@/components/business/VoidDocumentModal";
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
  Product,
  Sale,
} from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessPermissions } from "@/hooks/useBusinessPermissions";
import { exportToCsv } from "@/lib/csvExport";

type DraftItem = { productId: string; quantity: number; unitPrice: number };
const newItem = (): DraftItem => ({ productId: "", quantity: 1, unitPrice: 0 });

interface HeldOrder {
  id: string;
  label: string;
  customerId: string;
  customerName: string;
  items: DraftItem[];
  total: number;
  notes: string;
  heldAt: string;
}

function playCashierSound(type: "scan" | "success" | "park" = "scan") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "scan") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "park") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // AudioContext muted or not permitted in current context
  }
}

export default function SalesPage() {
  const { isVietnamese, t } = useLanguage();
  const { canManageRecords } = useBusinessPermissions();
  const methodLabel = (method: string) => isVietnamese ? ({ Cash: "Tiền mặt", "Bank transfer": "Chuyển khoản", Card: "Thẻ", Other: "Khác" }[method] ?? method) : method;
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [createOpen, setCreateOpen] = useState(canManageRecords && params.get("create") === "1");
  const [customerId, setCustomerId] = useState(params.get("customer") ?? "");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentChoice, setPaymentChoice] = useState<"paid" | "partial" | "unpaid">("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [payingSale, setPayingSale] = useState<Sale | null>(null);
  const [laterPayment, setLaterPayment] = useState(0);
  const [laterMethod, setLaterMethod] = useState("Cash");
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  // Reversal & Void state
  const [reversingPayment, setReversingPayment] = useState<{
    saleId: string;
    paymentId: string;
    amount: number;
    currency: string;
    method: string;
    saleNumber: string;
  } | null>(null);
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);

  // Barcode & rapid scan state
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Park / Held Orders state
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    try {
      const raw = localStorage.getItem("tenvora_held_orders");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [heldOrdersOpen, setHeldOrdersOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("tenvora_held_orders", JSON.stringify(heldOrders));
    } catch {
      // ignore
    }
  }, [heldOrders]);

  const { data: customers = [] } = useQuery({
    queryKey: ["business-customers", "active"],
    queryFn: () => businessService.getCustomers(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => businessService.getProducts("", true),
  });
  const { data: salesData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["sales-paged", search, page],
    queryFn: () => businessService.getSalesPaged(search, undefined, undefined, undefined, page, pageSize),
  });
  const sales = salesData?.items ?? [];
  const totalCount = salesData?.totalCount ?? 0;

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
      queryClient.invalidateQueries({ queryKey: ["sales-paged"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      setCreateOpen(false);
      resetForm();
      playCashierSound("success");
      setReceiptSale(sale);
      toast.success(isVietnamese ? "Đã ghi đơn bán thành công!" : "Sale recorded successfully!", {
        description: sale.outstandingBalance > 0
          ? (isVietnamese ? `${sale.customerName} còn nợ ${businessMoney(sale.outstandingBalance, sale.currency)}.` : `${sale.customerName} now owes ${businessMoney(sale.outstandingBalance, sale.currency)}.`)
          : (isVietnamese ? `${sale.customerName} đã thanh toán đủ.` : `${sale.customerName} paid in full.`),
      });
    },
    onError: (error) =>
      toast.error(apiError(error, isVietnamese ? "Không thể ghi đơn bán." : "Could not record the sale.")),
  });
  const pay = useMutation({
    mutationFn: () =>
      businessService.recordPayment(payingSale!.id, {
        amount: laterPayment,
        method: laterMethod,
      }),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ["sales-paged"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      setPayingSale(null);
      playCashierSound("success");
      toast.success(isVietnamese ? "Đã ghi khoản thanh toán" : "Payment recorded", { description: sale.outstandingBalance > 0 ? (isVietnamese ? `Còn lại: ${businessMoney(sale.outstandingBalance, sale.currency)}.` : `Remaining balance: ${businessMoney(sale.outstandingBalance, sale.currency)}.`) : (isVietnamese ? "Đơn bán này đã được thanh toán đủ." : "This sale is now paid in full.") });
    },
    onError: (error) =>
      toast.error(apiError(error, isVietnamese ? "Không thể ghi khoản thanh toán." : "Could not record the payment.")),
  });

  const handleReversePayment = async (reason: string) => {
    if (!reversingPayment) return;
    await businessService.reverseSalePayment(reversingPayment.saleId, reversingPayment.paymentId, reason);
    queryClient.invalidateQueries({ queryKey: ["sales-paged"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["business-customers"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
  };

  const handleVoidSale = async (options: { reversePayments: boolean; reason?: string }) => {
    if (!voidingSale) return;
    await businessService.voidSale(voidingSale.id, options);
    queryClient.invalidateQueries({ queryKey: ["sales-paged"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["business-customers"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
  };

  function resetForm() {
    setCustomerId("");
    setItems([newItem()]);
    setPaymentAmount(0);
    setPaymentChoice("unpaid");
    setPaymentMethod("Cash");
    setNotes("");
  }

  const handleSelectWalkIn = async () => {
    const walkInName = isVietnamese ? "Khách lẻ" : "Walk-in Guest";
    const existing = customers.find(
      (c) =>
        c.name.toLowerCase() === walkInName.toLowerCase() ||
        c.name.toLowerCase() === "khách lẻ" ||
        c.name.toLowerCase() === "walk-in guest"
    );
    if (existing) {
      setCustomerId(existing.id);
      toast.success(isVietnamese ? "Đã chọn Khách lẻ" : "Selected Walk-in Guest");
    } else {
      try {
        const created = await businessService.createCustomer({
          name: walkInName,
          notes: isVietnamese ? "Khách mua lẻ vãng lai" : "Default walk-in guest",
        });
        await queryClient.invalidateQueries({ queryKey: ["business-customers"] });
        setCustomerId(created.id);
        toast.success(isVietnamese ? "Đã tạo và chọn Khách lẻ" : "Created & selected Walk-in Guest");
      } catch {
        toast.error(isVietnamese ? "Không thể chọn Khách lẻ." : "Failed to select Walk-in customer.");
      }
    }
  };
  // Barcode & Rapid item matching
  const matchedProducts = useMemo(() => {
    const q = barcodeQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.isActive &&
          ((p.sku && p.sku.toLowerCase().includes(q)) ||
            p.name.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [barcodeQuery, products]);

  const addProductToCart = (product: Product) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id);
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (prev.length === 1 && !prev[0].productId) {
        return [{ productId: product.id, quantity: 1, unitPrice: product.defaultPrice }];
      }
      return [...prev, { productId: product.id, quantity: 1, unitPrice: product.defaultPrice }];
    });

    playCashierSound("scan");
    toast.success(
      isVietnamese
        ? `+1 ${product.name} (${businessMoney(product.defaultPrice, currency)})`
        : `+1 ${product.name} (${businessMoney(product.defaultPrice, currency)})`
    );
  };

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = barcodeQuery.trim().toLowerCase();
    if (!q) return;

    let target = products.find(
      (p) =>
        p.isActive &&
        ((p.sku && p.sku.toLowerCase() === q) || p.name.toLowerCase() === q)
    );

    if (!target && matchedProducts.length > 0) {
      target = matchedProducts[0];
    }

    if (target) {
      addProductToCart(target);
      setBarcodeQuery("");
    } else {
      toast.error(
        isVietnamese
          ? `Không tìm thấy hàng hoá với mã "${barcodeQuery}".`
          : `No product found matching "${barcodeQuery}".`
      );
    }
  };

  // Park & Resume Order Handlers
  const handleParkOrder = () => {
    const activeItems = items.filter((i) => i.productId);
    if (activeItems.length === 0) {
      toast.error(isVietnamese ? "Chưa có mặt hàng nào để lưu đơn." : "No items in cart to park.");
      return;
    }

    const cust = customers.find((c) => c.id === customerId);
    const custName = cust?.name || (isVietnamese ? "Khách lẻ" : "Walk-in Guest");
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const defaultLabel = `${custName} (${timeStr})`;

    const newHeld: HeldOrder = {
      id: `held-${Date.now()}`,
      label: defaultLabel,
      customerId: customerId,
      customerName: custName,
      items: activeItems,
      total: total,
      notes: notes,
      heldAt: new Date().toISOString(),
    };

    playCashierSound("park");
    setHeldOrders((prev) => [newHeld, ...prev]);
    resetForm();
    setCreateOpen(false);
    toast.success(
      isVietnamese
        ? `Đã lưu đơn tạm: ${defaultLabel}`
        : `Order parked: ${defaultLabel}`,
      {
        description: isVietnamese
          ? "Bạn có thể khôi phục lại đơn này bất cứ lúc nào."
          : "You can resume this order anytime.",
      }
    );
  };

  const handleResumeOrder = (held: HeldOrder) => {
    setCustomerId(held.customerId);
    setItems(held.items);
    setNotes(held.notes);
    setPaymentChoice("unpaid");
    setPaymentAmount(0);
    setHeldOrders((prev) => prev.filter((o) => o.id !== held.id));
    setHeldOrdersOpen(false);
    setCreateOpen(true);
    toast.success(
      isVietnamese
        ? `Đã khôi phục đơn: ${held.label}`
        : `Resumed order: ${held.label}`
    );
  };

  const handleDiscardOrder = (heldId: string) => {
    setHeldOrders((prev) => prev.filter((o) => o.id !== heldId));
    toast.info(isVietnamese ? "Đã xoá đơn lưu tạm." : "Held order discarded.");
  };

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
      toast.error(isVietnamese ? "Hãy chọn khách hàng và hàng hoá cho từng dòng." : "Choose a customer and product for every line.");
      return;
    }
    create.mutate();
  }
  function openPayment(sale: Sale) {
    setPayingSale(sale);
    setLaterPayment(sale.outstandingBalance);
    setLaterMethod("Cash");
  }

  const handleExportCsv = () => {
    if (sales.length === 0) return;
    exportToCsv(
      `sales-${new Date().toISOString().split("T")[0]}`,
      [
        { header: isVietnamese ? "Mã đơn bán" : "Sale Number", accessor: (s) => s.saleNumber },
        { header: isVietnamese ? "Khách hàng" : "Customer", accessor: (s) => s.customerName },
        { header: isVietnamese ? "Thời gian" : "Sold At", accessor: (s) => new Date(s.soldAt).toLocaleString() },
        { header: isVietnamese ? "Mặt hàng" : "Items", accessor: (s) => s.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join("; ") },
        { header: isVietnamese ? "Tổng tiền" : "Total Amount", accessor: (s) => s.totalAmount },
        { header: isVietnamese ? "Đã thanh toán" : "Paid Amount", accessor: (s) => s.paidAmount },
        { header: isVietnamese ? "Còn nợ" : "Outstanding Balance", accessor: (s) => s.outstandingBalance },
        { header: isVietnamese ? "Trạng thái thanh toán" : "Payment Status", accessor: (s) => s.paymentStatus },
      ],
      sales
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isVietnamese ? "Tiền bán hàng" : "Money coming in"}
          title={t("nav.sales")}
          description={
            isVietnamese
              ? "Ghi khách đã mua gì và đã thanh toán chưa. Tenvora tự theo dõi số tiền còn nợ."
              : "Record what a customer bought and whether they paid. Tenvora keeps the running balance for you."
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {canManageRecords && <Button asChild variant="outline" className="gap-2"><Link to="/imports?type=sales"><FileUp className="h-4 w-4" />{isVietnamese ? "Nhập hóa đơn" : "Import invoices"}</Link></Button>}
              {canManageRecords && heldOrders.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setHeldOrdersOpen(true)}
                  className="gap-2 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-semibold"
                >
                  <PauseCircle className="h-4 w-4 text-amber-600" />
                  {isVietnamese ? `Đơn tạm (${heldOrders.length})` : `Held Orders (${heldOrders.length})`}
                </Button>
              )}
              {sales.length > 0 && (
                <Button variant="outline" onClick={handleExportCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isVietnamese ? "Xuất CSV" : "Export CSV"}
                </Button>
              )}
              {canManageRecords && (
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {isVietnamese ? "Đơn bán mới" : "New sale"}
                </Button>
              )}
            </div>
          }
        />
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={isVietnamese ? "Tìm khách hàng, hàng hoá hoặc mã đơn" : "Search customer, product, or sale number"}
            className="pl-9"
          />
        </div>
        {isLoading ? (
          <LoadingState label={isVietnamese ? "Đang mở sổ bán hàng…" : "Opening your sales book…"} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => { void refetch(); }} retrying={isFetching} />
        ) : sales.length === 0 ? (
          <EmptyState icon={ReceiptText} title={search ? (isVietnamese ? "Không tìm thấy đơn bán phù hợp" : "No sales match that search") : (isVietnamese ? "Chưa có đơn bán" : "No sales yet")} description={search ? (isVietnamese ? "Hãy thử tên khách hàng, hàng hoá hoặc mã đơn khác." : "Try a customer name, product, or sale number.") : (isVietnamese ? "Đơn bán sẽ xuất hiện tại đây sau khi bạn ghi đơn đầu tiên. Hãy thêm khách hàng và hàng hoá trước nếu cần." : "Your sales will appear here after you record the first one. Add a customer and product first if you haven't already.")} action={!search && canManageRecords ? <Button onClick={() => setCreateOpen(true)}>{isVietnamese ? "Ghi đơn bán đầu tiên" : "Record first sale"}</Button> : undefined} />
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {sales.map((sale) => {
                const isVoided = sale.status === "Voided";
                return (
                  <article
                    key={sale.id}
                    className={`paper-card p-5 transition-colors sm:p-6 ${
                      isVoided ? "opacity-60 bg-muted/20 border-dashed" : "hover:border-primary/25"
                    }`}
                  >
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
                        <p className={`text-xl font-semibold ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                          {businessMoney(sale.totalAmount, sale.currency)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isVietnamese ? "Đã thu" : "Paid"} {businessMoney(sale.paidAmount, sale.currency)}
                        </p>
                        {sale.outstandingBalance > 0 && !isVoided && (
                          <p className="mt-1 font-semibold text-amber-600">
                            {isVietnamese ? "Còn nợ" : "Owed"}{" "}
                            {businessMoney(
                              sale.outstandingBalance,
                              sale.currency,
                            )}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReceiptSale(sale)}
                            className="gap-1.5"
                          >
                            <Printer className="h-4 w-4" />
                            {isVietnamese ? "In phiếu" : "Receipt"}
                          </Button>
                          {canManageRecords && sale.outstandingBalance > 0 && !isVoided && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPayment(sale)}
                              className="gap-1.5"
                            >
                              <WalletCards className="h-4 w-4" />
                              {isVietnamese ? "Nhận thanh toán" : "Receive payment"}
                            </Button>
                          )}
                          {canManageRecords && !isVoided && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setVoidingSale(sale)}
                              className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Ban className="h-4 w-4" />
                              {isVietnamese ? "Hủy đơn" : "Void"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {sale.payments.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {isVietnamese ? "Lịch sử thanh toán" : "Payment history"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {sale.payments.map((payment) => (
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
                                      saleId: sale.id,
                                      paymentId: payment.id,
                                      amount: payment.amount,
                                      currency: payment.currency,
                                      method: payment.method,
                                      saleNumber: sale.saleNumber,
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><span className="notebook-label w-fit">{isVietnamese ? "Phiếu bán hàng" : "Digital sales slip"}</span><DialogTitle className="mt-2">{isVietnamese ? "Đơn bán mới" : "New sale"}</DialogTitle><DialogDescription>{isVietnamese ? "Chọn người mua, hàng hoá, số tiền và tình trạng thanh toán." : "Just answer: who bought what, how much, and did they pay?"}</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{isVietnamese ? "Ai mua hàng?" : "Who bought it?"} *</Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectWalkIn}
                  className="h-7 text-xs gap-1.5 font-medium border border-amber-200/60 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  {isVietnamese ? "Khách lẻ (Bán nhanh)" : "Walk-in Guest"}
                </Button>
              </div>
              {customers.length === 0 && !customerId ? (
                <PrerequisiteNotice
                  icon={UserPlus}
                  title={isVietnamese ? "Chưa có khách hàng để chọn" : "No customers available"}
                  description={isVietnamese ? "Thêm khách hàng đầu tiên, sau đó bạn sẽ quay lại đơn bán này." : "Create your first customer, then return directly to this sale."}
                  action={<Button type="button" asChild><Link to="/customers?create=1&returnTo=%2Fsales%3Fcreate%3D1"><Plus />{isVietnamese ? "Thêm khách hàng" : "Create customer"}</Link></Button>}
                />
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={isVietnamese ? "Chọn khách hàng" : "Choose the customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" asChild><Link to="/customers?create=1&returnTo=%2Fsales%3Fcreate%3D1"><Plus />{isVietnamese ? "Khách mới" : "New customer"}</Link></Button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{isVietnamese ? "Họ mua gì?" : "What did they buy?"} *</Label>
                {products.length > 0 && <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" asChild><Link to="/products?create=1&returnTo=%2Fsales%3Fcreate%3D1"><Plus className="mr-1 h-3 w-3" />{isVietnamese ? "Hàng mới" : "New product"}</Link></Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, newItem()])}><Plus className="mr-1 h-3 w-3" />{isVietnamese ? "Thêm dòng" : "Add line"}</Button>
                </div>}
              </div>

              {products.length > 0 && (
                <div className="rounded-xl border bg-muted/40 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ScanBarcode className="h-4 w-4" />
                    </div>
                    <Input
                      ref={barcodeInputRef}
                      value={barcodeQuery}
                      onChange={(e) => setBarcodeQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleBarcodeSubmit();
                        }
                      }}
                      placeholder={
                        isVietnamese
                          ? "Quét mã vạch / SKU hoặc gõ tên sản phẩm rồi Enter…"
                          : "Scan barcode / SKU or type name & hit Enter…"
                      }
                      className="h-8 border-0 bg-background/90 shadow-none text-xs"
                    />
                    {barcodeQuery && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setBarcodeQuery("")}
                        className="h-7 w-7 p-0 shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleBarcodeSubmit()}
                      disabled={!barcodeQuery.trim()}
                      className="h-8 text-xs font-semibold px-3 shrink-0"
                    >
                      {isVietnamese ? "Thêm" : "Add"}
                    </Button>
                  </div>
                  {matchedProducts.length > 0 && barcodeQuery.trim() && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold mr-1">
                        {isVietnamese ? "Gợi ý:" : "Suggestions:"}
                      </span>
                      {matchedProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            addProductToCart(p);
                            setBarcodeQuery("");
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-background px-2.5 py-1 text-xs border border-border/70 hover:border-primary hover:text-primary transition-colors text-left font-medium"
                        >
                          <Plus className="h-3 w-3 text-primary" />
                          <span>{p.name}</span>
                          {p.sku && <span className="text-[10px] text-muted-foreground">({p.sku})</span>}
                          <span className="font-bold text-foreground ml-1">
                            {businessMoney(p.defaultPrice, p.currency)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {products.length === 0 ? (
                <PrerequisiteNotice
                  icon={PackagePlus}
                  title={isVietnamese ? "Chưa có hàng hoá hoặc dịch vụ" : "No products or services available"}
                  description={isVietnamese ? "Tạo một mặt hàng với đơn vị và giá mặc định để dùng trong đơn bán." : "Create a product with its unit and usual price before recording a sale."}
                  action={<Button type="button" asChild><Link to="/products?create=1&returnTo=%2Fsales%3Fcreate%3D1"><Plus />{isVietnamese ? "Thêm hàng hoá" : "Create product"}</Link></Button>}
                />
              ) : items.map((item, index) => {
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
                        <SelectValue placeholder={isVietnamese ? "Chọn hàng hoá" : "Choose a product"} />
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
                      <Label className="sr-only">{isVietnamese ? "Số lượng" : "Quantity"}</Label>
                      <Input
                        aria-label={isVietnamese ? "Số lượng" : "Quantity"}
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
                      <Label className="sr-only">{isVietnamese ? "Đơn giá" : "Unit price"}</Label>
                      <Input
                        aria-label={isVietnamese ? "Đơn giá" : "Unit price"}
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
                <span className="text-sm font-bold">{t("common.total")}</span>
                <span className="tabular-nums text-2xl font-bold">
                  {businessMoney(total, currency)}
                </span>
              </div>
            </div>
            <fieldset className="space-y-3"><legend className="text-sm font-bold">{isVietnamese ? "Khách đã thanh toán chưa?" : "Did they pay?"}</legend><div className="grid gap-2 sm:grid-cols-3">{([
              ["paid", isVietnamese ? "Đã trả đủ" : "Paid in full"], ["partial", isVietnamese ? "Trả một phần" : "Partly paid"], ["unpaid", isVietnamese ? "Chưa trả" : "Not paid yet"],
            ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setPaymentChoice(value); if (value === "unpaid") setPaymentAmount(0); }} className={`friendly-focus flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors ${paymentChoice === value ? "border-primary bg-accent text-primary" : "bg-card hover:bg-secondary"}`}>{paymentChoice === value && <Check size={16} />}{label}</button>)}</div></fieldset>
            {paymentChoice === "partial" && <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="initial-payment">{isVietnamese ? "Khách đã trả bao nhiêu?" : "How much did they pay?"}</Label>
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
                  {isVietnamese ? "Khách còn nợ:" : "They will still owe:"}{" "}
                  {businessMoney(Math.max(0, total - paymentAmount), currency)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{isVietnamese ? "Phương thức thanh toán" : "Payment method"}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">{methodLabel("Cash")}</SelectItem>
                    <SelectItem value="Bank transfer">{methodLabel("Bank transfer")}</SelectItem>
                    <SelectItem value="Card">{methodLabel("Card")}</SelectItem>
                    <SelectItem value="Other">{methodLabel("Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div></div>}
            {paymentChoice === "paid" && (
              <div className="grid gap-3 sm:grid-cols-2 items-center rounded-xl bg-accent/40 p-3.5 border">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    {isVietnamese ? "Thanh toán đủ" : "Paid in full"}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {businessMoney(total, currency)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{isVietnamese ? "Phương thức thanh toán" : "Payment method"}</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">{methodLabel("Cash")}</SelectItem>
                      <SelectItem value="Bank transfer">{methodLabel("Bank transfer")}</SelectItem>
                      <SelectItem value="Card">{methodLabel("Card")}</SelectItem>
                      <SelectItem value="Other">{methodLabel("Other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="sale-notes">{isVietnamese ? "Ghi chú thêm" : "Anything else to remember?"} <span className="font-normal text-muted-foreground">({isVietnamese ? "không bắt buộc" : "optional"})</span></Label>
              <Textarea
                id="sale-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <div className="flex items-center gap-2 mr-auto">
                {items.some((i) => i.productId) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleParkOrder}
                    className="gap-1.5 border-dashed border-amber-300 text-amber-900 bg-amber-50/60 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs h-9"
                  >
                    <PauseCircle className="h-4 w-4 text-amber-600" />
                    {isVietnamese ? "Lưu đơn tạm" : "Park order"}
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                disabled={
                  create.isPending ||
                  customers.length === 0 ||
                  products.length === 0
                }
              >
                {create.isPending ? (isVietnamese ? "Đang lưu đơn bán…" : "Saving the sale…") : (isVietnamese ? "Lưu đơn bán" : "Save sale")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Held / Parked Orders Dialog */}
      <Dialog open={heldOrdersOpen} onOpenChange={setHeldOrdersOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-amber-600" />
              <span>{isVietnamese ? "Danh sách đơn lưu tạm" : "Held / Parked Orders"}</span>
            </DialogTitle>
            <DialogDescription>
              {isVietnamese
                ? "Các đơn hàng đang tạm dừng tại quầy. Bạn có thể khôi phục lại để tính tiền hoặc xoá bỏ."
                : "Parked orders awaiting checkout. You can resume any order to finish payment."}
            </DialogDescription>
          </DialogHeader>

          {heldOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isVietnamese ? "Không có đơn hàng nào đang lưu tạm." : "No parked orders."}
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {heldOrders.map((held) => (
                <div
                  key={held.id}
                  className="rounded-xl border bg-card p-4 space-y-3 transition-colors hover:border-amber-300 dark:hover:border-amber-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm">{held.label}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(held.heldAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                        {held.items.length} {isVietnamese ? "mặt hàng" : "items"}
                      </p>
                    </div>
                    <span className="tabular-nums font-bold text-base text-primary">
                      {businessMoney(held.total, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t pt-2.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDiscardOrder(held.id)}
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isVietnamese ? "Xoá" : "Discard"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResumeOrder(held)}
                      className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {isVietnamese ? "Khôi phục đơn" : "Resume"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHeldOrdersOpen(false)}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!payingSale}
        onOpenChange={(open) => !open && setPayingSale(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isVietnamese ? "Nhận thanh toán" : "Receive payment"}</DialogTitle>
            <DialogDescription>{isVietnamese ? "Thêm khoản thanh toán mới mà không thay đổi lịch sử trước đó." : "Add a payment without replacing the existing payment history."}</DialogDescription>
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
                  {isVietnamese ? "Còn nợ" : "Outstanding"}{" "}
                  {businessMoney(
                    payingSale.outstandingBalance,
                    payingSale.currency,
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">{isVietnamese ? "Số tiền" : "Amount"} *</Label>
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
                <Label>{isVietnamese ? "Phương thức" : "Method"}</Label>
                <Select value={laterMethod} onValueChange={setLaterMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">{methodLabel("Cash")}</SelectItem>
                    <SelectItem value="Bank transfer">{methodLabel("Bank transfer")}</SelectItem>
                    <SelectItem value="Card">{methodLabel("Card")}</SelectItem>
                    <SelectItem value="Other">{methodLabel("Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayingSale(null)}
                >
                  {t("common.cancel")}
                </Button>
                <Button disabled={pay.isPending}>
                  {pay.isPending ? (isVietnamese ? "Đang ghi…" : "Recording…") : (isVietnamese ? "Ghi thanh toán" : "Record payment")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <ReceiptModal
        open={!!receiptSale}
        onOpenChange={(open) => !open && setReceiptSale(null)}
        sale={receiptSale}
      />
      {reversingPayment && (
        <PaymentReversalModal
          open={!!reversingPayment}
          onOpenChange={(open) => !open && setReversingPayment(null)}
          paymentId={reversingPayment.paymentId}
          paymentAmount={reversingPayment.amount}
          paymentCurrency={reversingPayment.currency}
          paymentMethod={reversingPayment.method}
          referenceDocNumber={reversingPayment.saleNumber}
          onConfirm={handleReversePayment}
        />
      )}
      {voidingSale && (
        <VoidDocumentModal
          open={!!voidingSale}
          onOpenChange={(open) => !open && setVoidingSale(null)}
          documentType="sale"
          documentNumber={voidingSale.saleNumber}
          totalAmountFormatted={businessMoney(voidingSale.totalAmount, voidingSale.currency)}
          hasPayments={voidingSale.payments.some((p) => !p.isReversed)}
          onConfirm={handleVoidSale}
        />
      )}
    </DashboardLayout>
  );
}
