import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Mail, MapPin, MessageCircle, Phone, Plus, Printer, ReceiptText, Undo2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { QueryErrorState } from "@/components/business/QueryErrorState";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, MoneyCard, StatusPill } from "@/components/business/BusinessUI";
import { ReceiptModal } from "@/components/business/ReceiptModal";
import { DebtReminderModal } from "@/components/business/DebtReminderModal";
import { CustomerStatementModal } from "@/components/business/CustomerStatementModal";
import { PaymentReversalModal } from "@/components/business/PaymentReversalModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiError, businessMoney, businessService, Sale } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessPermissions } from "@/hooks/useBusinessPermissions";

export default function CustomerDetailPage() {
  const { isVietnamese, t } = useLanguage();
  const { canManageRecords } = useBusinessPermissions();
  const methodLabel = (method: string) =>
    isVietnamese
      ? ({ Cash: "Tiền mặt", "Bank transfer": "Chuyển khoản", Card: "Thẻ", Other: "Khác" }[method] ?? method)
      : method;

  const { id = "" } = useParams();
  const queryClient = useQueryClient();

  // Individual sale payment
  const [sale, setSale] = useState<Sale | null>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Cash");

  // Account-level lump-sum payment
  const [accountPaymentOpen, setAccountPaymentOpen] = useState(false);
  const [accountAmount, setAccountAmount] = useState(0);
  const [accountMethod, setAccountMethod] = useState("Cash");
  const [accountRef, setAccountRef] = useState("");
  const [accountNotes, setAccountNotes] = useState("");

  // Receipt & Reminder & Statement modals
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  // Reversal state
  const [reversingPayment, setReversingPayment] = useState<{
    saleId: string;
    paymentId: string;
    amount: number;
    currency: string;
    method: string;
    saleNumber: string;
  } | null>(null);

  const query = useQuery({
    queryKey: ["business-customer", id],
    queryFn: () => businessService.getCustomer(id),
    enabled: !!id,
  });

  const payment = useMutation({
    mutationFn: () => businessService.recordPayment(sale!.id, { amount, method }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["business-customer", id] });
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      setSale(null);
      toast.success(isVietnamese ? "Đã ghi khoản thanh toán" : "Payment recorded", {
        description:
          updated.outstandingBalance > 0
            ? isVietnamese
              ? `Còn lại: ${businessMoney(updated.outstandingBalance, updated.currency)}.`
              : `Remaining balance: ${businessMoney(updated.outstandingBalance, updated.currency)}.`
            : isVietnamese
            ? "Đơn bán này đã được thanh toán đủ."
            : "This sale is now paid in full.",
      });
    },
    onError: (error) =>
      toast.error(apiError(error, isVietnamese ? "Không thể ghi khoản thanh toán." : "Could not record payment.")),
  });

  const accountPayment = useMutation({
    mutationFn: () =>
      businessService.recordCustomerAccountPayment(id, {
        amount: accountAmount,
        method: accountMethod,
        reference: accountRef || undefined,
        notes: accountNotes || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["business-customer", id] });
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      setAccountPaymentOpen(false);
      toast.success(isVietnamese ? "Đã phân bổ thanh toán công nợ" : "Account payment allocated", {
        description: isVietnamese
          ? `Đã phân bổ ${businessMoney(result.totalAllocated, query.data?.customer.currency ?? "USD")} qua ${result.affectedSales.length} đơn bán. Số dư còn lại: ${businessMoney(result.remainingBalance, query.data?.customer.currency ?? "USD")}.`
          : `Allocated ${businessMoney(result.totalAllocated, query.data?.customer.currency ?? "USD")} across ${result.affectedSales.length} sales. Remaining balance: ${businessMoney(result.remainingBalance, query.data?.customer.currency ?? "USD")}.`,
      });
    },
    onError: (error) =>
      toast.error(apiError(error, isVietnamese ? "Không thể ghi thanh toán công nợ." : "Could not allocate account payment.")),
  });

  const openPayment = (selected: Sale) => {
    setSale(selected);
    setAmount(selected.outstandingBalance);
    setMethod("Cash");
  };

  const openAccountPayment = () => {
    if (query.isError) return <DashboardLayout><QueryErrorState error={query.error} onRetry={() => { void query.refetch(); }} retrying={query.isFetching} /></DashboardLayout>;

  if (!query.data) return;
    setAccountAmount(query.data.customer.outstandingBalance);
    setAccountMethod("Cash");
    setAccountRef("");
    setAccountNotes("");
    setAccountPaymentOpen(true);
  };

  const handleReversePayment = async (reason: string) => {
    if (!reversingPayment) return;
    await businessService.reverseSalePayment(reversingPayment.saleId, reversingPayment.paymentId, reason);
    queryClient.invalidateQueries({ queryKey: ["business-customer", id] });
    queryClient.invalidateQueries({ queryKey: ["business-customers"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
  };

  if (query.isLoading)
    return (
      <DashboardLayout>
        <LoadingState label={isVietnamese ? "Đang mở sổ khách hàng…" : "Opening this customer's record…"} />
      </DashboardLayout>
    );

  if (!query.data)
    return (
      <DashboardLayout>
        <EmptyState
          icon={ReceiptText}
          title={isVietnamese ? "Không tìm thấy khách hàng" : "Customer not found"}
          description={
            isVietnamese
              ? "Khách hàng có thể đã bị xoá hoặc đường dẫn không đúng."
              : "This customer may have been removed or the link may be incorrect."
          }
          action={
            <Button asChild variant="outline">
              <Link to="/customers">{isVietnamese ? "Về danh sách khách hàng" : "Back to customers"}</Link>
            </Button>
          }
        />
      </DashboardLayout>
    );

  const { customer, sales } = query.data;

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <Button asChild variant="ghost" className="-ml-3">
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {isVietnamese ? "Khách hàng" : "Customers"}
          </Link>
        </Button>

        <header className="flex flex-col gap-5">
          <div>
            <span className="notebook-label">{isVietnamese ? "Sổ khách hàng" : "Customer record"}</span>
            <h1 className="page-title mt-3">{customer.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {customer.phone && (
                <span className="inline-flex items-center gap-2">
                  <Phone size={15} />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="inline-flex items-center gap-2">
                  <Mail size={15} />
                  {customer.email}
                </span>
              )}
              {customer.address && (
                <span className="inline-flex items-center gap-2">
                  <MapPin size={15} />
                  {customer.address}
                </span>
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 [&_button]:h-10 [&_a]:h-10">
            <Button
              variant="outline"
              onClick={() => setStatementOpen(true)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {isVietnamese ? "Sao kê công nợ" : "Account statement"}
            </Button>
            {customer.outstandingBalance > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setReminderOpen(true)}
                  className="gap-2 border-sky-300 hover:border-sky-400 hover:bg-sky-50 dark:border-sky-800 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium"
                >
                  <MessageCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  {isVietnamese ? "Nhắc nợ Zalo / SMS" : "Remind via Zalo/SMS"}
                </Button>
                {canManageRecords && (
                  <Button variant="outline" onClick={openAccountPayment} className="gap-2">
                    <WalletCards className="h-4 w-4" />
                    {isVietnamese ? "Thu nợ tổng thể" : "Pay on Account"}
                  </Button>
                )}
              </>
            )}
            {canManageRecords && (
              <Button asChild className="gap-2 lg:ml-auto">
                <Link to={`/sales?create=1&customer=${customer.id}`}>
                  <Plus className="h-4 w-4" />
                  {isVietnamese ? "Đơn bán mới" : "New sale"}
                </Link>
              </Button>
            )}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <MoneyCard
            label={isVietnamese ? "Số dư hiện tại" : "Current balance"}
            value={businessMoney(customer.outstandingBalance, customer.currency)}
            detail={
              customer.outstandingBalance > 0
                ? isVietnamese
                  ? "Còn phải thu"
                  : "Still to collect"
                : isVietnamese
                ? "Không còn nợ"
                : "Nothing outstanding"
            }
            icon={WalletCards}
            tone={customer.outstandingBalance > 0 ? "attention" : "good"}
          />
          <MoneyCard
            label={isVietnamese ? "Tổng tiền bán" : "Total sales"}
            value={businessMoney(customer.totalSales, customer.currency)}
            detail={
              isVietnamese
                ? `${customer.salesCount} đơn bán đã ghi`
                : `${customer.salesCount} recorded sale${customer.salesCount === 1 ? "" : "s"}`
            }
            icon={ReceiptText}
          />
          <MoneyCard
            label={isVietnamese ? "Tiền đã nhận" : "Money received"}
            value={businessMoney(customer.totalPaid, customer.currency)}
            detail={isVietnamese ? "Từ tất cả khoản thanh toán" : "Across all payments"}
            icon={WalletCards}
            tone="good"
          />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">{isVietnamese ? "Đơn bán và thanh toán" : "Sales and payments"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isVietnamese ? "Bản ghi mới nhất hiển thị trước." : "Newest records first, like a clear running notebook."}
            </p>
          </div>

          {sales.length === 0 ? (
            <EmptyState
              compact
              icon={ReceiptText}
              title={isVietnamese ? "Khách hàng này chưa có đơn bán" : "No sales for this customer"}
              description={isVietnamese ? "Đơn bán và khoản thanh toán sẽ xuất hiện tại đây." : "Their sales and payments will appear here."}
              action={canManageRecords ? (
                <Button asChild>
                  <Link to={`/sales?create=1&customer=${customer.id}`}>{isVietnamese ? "Ghi đơn bán" : "Record a sale"}</Link>
                </Button>
              ) : undefined}
            />
          ) : (
            <div className="relative space-y-4 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-border sm:before:left-6">
              {sales.map((entry) => (
                <article key={entry.id} className="paper-card relative ml-10 p-5 sm:ml-12 sm:p-6">
                  <span className="absolute left-[-2.68rem] top-5 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground sm:left-[-3.17rem]">
                    <ReceiptText size={13} />
                  </span>
                  <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-muted-foreground">{entry.saleNumber}</p>
                        <StatusPill status={entry.paymentStatus} />
                      </div>
                      <p className="mt-3 font-bold">
                        {entry.items.map((item) => `${item.quantity} ${item.unit} ${item.productName}`).join(" · ")}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{new Date(entry.soldAt).toLocaleString()}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="tabular-nums text-xl font-bold">{businessMoney(entry.totalAmount, entry.currency)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isVietnamese ? "Đã nhận" : "Received"} {businessMoney(entry.paidAmount, entry.currency)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setReceiptSale(entry)} className="gap-1.5">
                          <Printer className="h-3.5 w-3.5" />
                          {isVietnamese ? "In phiếu" : "Receipt"}
                        </Button>
                        {canManageRecords && entry.outstandingBalance > 0 && (
                          <Button size="sm" variant="outline" onClick={() => openPayment(entry)} className="gap-1.5">
                            <WalletCards className="h-3.5 w-3.5" />
                            {isVietnamese ? "Nhận thanh toán" : "Receive payment"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {entry.payments.length > 0 && (
                    <div className="mt-5 rounded-xl bg-secondary/55 p-4">
                      <p className="micro-label">{isVietnamese ? "Thanh toán đã nhận" : "Payments received"}</p>
                      <div className="mt-2 divide-y">
                        {entry.payments.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span className={`text-muted-foreground ${item.isReversed ? "line-through text-destructive/70" : ""}`}>
                              {new Date(item.paidAt).toLocaleDateString()} · {methodLabel(item.method)}
                              {item.reference && ` · Ref: ${item.reference}`}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`tabular-nums font-bold ${item.isReversed ? "line-through text-muted-foreground" : ""}`}>
                                {businessMoney(item.amount, item.currency)}
                              </span>
                              {item.isReversed ? (
                                <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                                  {isVietnamese ? "Đã hoàn tác" : "Reversed"}
                                </span>
                              ) : canManageRecords ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReversingPayment({
                                      saleId: entry.id,
                                      paymentId: item.id,
                                      amount: item.amount,
                                      currency: item.currency,
                                      method: item.method,
                                      saleNumber: entry.saleNumber,
                                    })
                                  }
                                  title={isVietnamese ? "Hoàn tác thanh toán này" : "Reverse this payment"}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Undo2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sale-level Payment Dialog */}
      <Dialog open={!!sale} onOpenChange={(open) => !open && setSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <span className="notebook-label w-fit">{isVietnamese ? "Phiếu thanh toán" : "Payment receipt"}</span>
            <DialogTitle className="mt-2">
              {isVietnamese ? `Nhận thanh toán từ ${customer.name}` : `Receive payment from ${customer.name}`}
            </DialogTitle>
            <DialogDescription>
              {isVietnamese
                ? "Ghi số tiền đã nhận cho đơn hàng này."
                : "Record the amount received for this sale."}
            </DialogDescription>
          </DialogHeader>
          {sale && (
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                payment.mutate();
              }}
              className="space-y-5"
            >
              <div className="rounded-2xl border bg-[hsl(var(--warning)/.1)] p-4 text-sm">
                <p className="text-muted-foreground">
                  {isVietnamese ? `Đang nợ cho ${sale.saleNumber}` : `Currently owed for ${sale.saleNumber}`}
                </p>
                <strong className="mt-1 block text-xl">{businessMoney(sale.outstandingBalance, sale.currency)}</strong>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-payment">
                  {isVietnamese ? "Khách đã trả bao nhiêu?" : "How much did they pay?"} *
                </Label>
                <Input
                  id="customer-payment"
                  autoFocus
                  required
                  type="number"
                  min="0.0001"
                  max={sale.outstandingBalance}
                  step="any"
                  value={amount === 0 ? "" : amount}
                  onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>{isVietnamese ? "Phương thức thanh toán" : "Payment method"}</Label>
                <Select value={method} onValueChange={setMethod}>
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
                <Button type="button" variant="outline" onClick={() => setSale(null)}>
                  {t("common.cancel")}
                </Button>
                <Button disabled={payment.isPending}>
                  {payment.isPending
                    ? isVietnamese
                      ? "Đang lưu thanh toán…"
                      : "Saving payment…"
                    : isVietnamese
                    ? "Lưu thanh toán"
                    : "Save payment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Account-level Lump-Sum FIFO Payment Dialog */}
      <Dialog open={accountPaymentOpen} onOpenChange={setAccountPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <span className="notebook-label w-fit">{isVietnamese ? "Thu nợ tổng thể" : "Account Payment"}</span>
            <DialogTitle className="mt-2">
              {isVietnamese ? `Thu nợ gộp từ ${customer.name}` : `Receive lump-sum payment from ${customer.name}`}
            </DialogTitle>
            <DialogDescription>
              {isVietnamese
                ? "Số tiền sẽ tự động được cấn trừ theo thứ tự từ đơn bán cũ nhất đến mới nhất (FIFO)."
                : "The payment will automatically settle oldest unpaid sales first (FIFO)."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              accountPayment.mutate();
            }}
            className="space-y-4"
          >
            <div className="rounded-2xl border bg-[hsl(var(--warning)/.1)] p-4 text-sm">
              <p className="text-muted-foreground">
                {isVietnamese ? "Tổng công nợ hiện tại của khách" : "Total outstanding debt"}
              </p>
              <strong className="mt-1 block text-2xl font-bold">
                {businessMoney(customer.outstandingBalance, customer.currency)}
              </strong>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-payment-amount">
                {isVietnamese ? "Số tiền khách trả" : "Payment amount"} *
              </Label>
              <Input
                id="account-payment-amount"
                autoFocus
                required
                type="number"
                min="0.0001"
                max={customer.outstandingBalance}
                step="any"
                value={accountAmount === 0 ? "" : accountAmount}
                onChange={(e) => setAccountAmount(e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{isVietnamese ? "Phương thức" : "Payment method"}</Label>
              <Select value={accountMethod} onValueChange={setAccountMethod}>
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

            <div className="space-y-2">
              <Label htmlFor="account-ref">{isVietnamese ? "Mã giao dịch / Tham chiếu" : "Reference / Transaction ID"}</Label>
              <Input
                id="account-ref"
                value={accountRef}
                onChange={(e) => setAccountRef(e.target.value)}
                placeholder="e.g. VCB-123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-notes">{isVietnamese ? "Ghi chú" : "Notes"}</Label>
              <Textarea
                id="account-notes"
                value={accountNotes}
                onChange={(e) => setAccountNotes(e.target.value)}
                placeholder={isVietnamese ? "Nội dung chuyển khoản, thoả thuận nợ…" : "Notes or payment agreement…"}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAccountPaymentOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button disabled={accountPayment.isPending}>
                {accountPayment.isPending
                  ? isVietnamese
                    ? "Đang phân bổ…"
                    : "Allocating…"
                  : isVietnamese
                  ? "Xác nhận thu nợ"
                  : "Confirm payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Slip Modal */}
      <ReceiptModal
        open={!!receiptSale}
        onOpenChange={(open) => !open && setReceiptSale(null)}
        sale={receiptSale}
      />

      {/* Debt Collection Reminder Modal */}
      {customer.outstandingBalance > 0 && (
        <DebtReminderModal
          open={reminderOpen}
          onOpenChange={setReminderOpen}
          customer={customer}
          sales={sales}
        />
      )}

      {/* Customer Account Statement Modal */}
      <CustomerStatementModal
        open={statementOpen}
        onOpenChange={setStatementOpen}
        customerId={customer.id}
        customerName={customer.name}
      />

      {/* Payment Reversal Modal */}
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
    </DashboardLayout>
  );
}
