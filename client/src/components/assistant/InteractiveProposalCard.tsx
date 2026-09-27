import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Package,
  Plus,
  Receipt,
  Send,
  Truck,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiActionProposalResponse } from "@/services/aiService";
import { apiError, businessService } from "@/services/businessService";

export interface InteractiveProposalCardProps {
  proposal: AiActionProposalResponse;
  busy: boolean;
  isVietnamese: boolean;
  currency?: string;
  onDecision: (confirmed: boolean) => void;
  onReply?: (text: string) => void;
  onCustomExecuted?: (resultText: string) => void;
}

function cleanInitialName(val?: string | null): string {
  if (!val) return "";
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === "a" ||
    lower === "an" ||
    lower === "the" ||
    lower === "một" ||
    lower === "mot" ||
    lower === "mới" ||
    lower === "moi"
  ) {
    return "";
  }
  return trimmed;
}

function parseInitialPrice(val?: string | null): number {
  if (!val) return 0;
  const isVnd = /vnd|đ|dong|đồng/i.test(val);
  let cleaned = val.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return 0;

  if ((cleaned.match(/\./g) || []).length > 1) {
    cleaned = cleaned.replace(/\./g, "");
  } else if (isVnd && /\.\d{3}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  } else if (cleaned.includes(",") && cleaned.includes(".")) {
    if (cleaned.indexOf(",") < cleaned.indexOf(".")) {
      cleaned = cleaned.replace(/,/g, "");
    } else {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (cleaned.includes(",")) {
    if (isVnd || /,\d{3}$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, "");
    } else {
      cleaned = cleaned.replace(/,/g, ".");
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, num);
}

export function InteractiveProposalCard({
  proposal,
  busy,
  isVietnamese,
  currency = "VND",
  onDecision,
  onReply,
  onCustomExecuted,
}: InteractiveProposalCardProps) {
  const queryClient = useQueryClient();
  const isSettled = proposal.status === "Executed" || proposal.status === "Cancelled";
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product Form State
  const [productName, setProductName] = useState(() =>
    cleanInitialName(
      proposal.details["Product"] ||
        proposal.details["Name"] ||
        proposal.details["Tên sản phẩm"]
    )
  );
  const [productUnit, setProductUnit] = useState(
    () => proposal.details["Unit"] || proposal.details["Đơn vị tính"] || "item"
  );
  const [productPrice, setProductPrice] = useState<number>(() =>
    parseInitialPrice(
      proposal.details["Default price"] ||
        proposal.details["Price"] ||
        proposal.details["Giá mặc định"]
    )
  );

  // Customer Form State
  const [customerName, setCustomerName] = useState(() =>
    cleanInitialName(
      proposal.details["Name"] ||
        proposal.details["Customer"] ||
        proposal.details["Tên khách hàng"]
    )
  );
  const [customerPhone, setCustomerPhone] = useState(
    () => proposal.details["Phone"] || proposal.details["Số điện thoại"] || ""
  );
  const [customerAddress, setCustomerAddress] = useState(
    () => proposal.details["Address"] || proposal.details["Địa chỉ"] || ""
  );
  const [customerEmail, setCustomerEmail] = useState(
    () => proposal.details["Email"] || ""
  );

  // Supplier Form State
  const [supplierName, setSupplierName] = useState(() =>
    cleanInitialName(
      proposal.details["Name"] ||
        proposal.details["Supplier"] ||
        proposal.details["Tên nhà cung cấp"]
    )
  );
  const [supplierPhone, setSupplierPhone] = useState(
    () => proposal.details["Phone"] || proposal.details["Số điện thoại"] || ""
  );
  const [supplierAddress, setSupplierAddress] = useState(
    () => proposal.details["Address"] || proposal.details["Địa chỉ"] || ""
  );

  // Expense Form State
  const [expenseCategory, setExpenseCategory] = useState(
    () =>
      proposal.details["Category"] ||
      proposal.details["Danh mục"] ||
      (isVietnamese ? "Chi phí vận hành" : "Operating Expense")
  );
  const [expenseAmount, setExpenseAmount] = useState<number>(() =>
    parseInitialPrice(proposal.details["Amount"] || proposal.details["Số tiền"])
  );
  const [expenseDescription, setExpenseDescription] = useState(
    () => proposal.details["Description"] || proposal.details["Mô tả"] || ""
  );

  // Refinement / Clarification
  const [adjustText, setAdjustText] = useState("");
  const [clarifyText, setClarifyText] = useState("");

  // Handlers for direct submission
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || isSubmitting || busy) return;
    setIsSubmitting(true);
    try {
      const created = await businessService.createProduct({
        name: productName.trim(),
        unit: productUnit.trim() || "item",
        defaultPrice: productPrice,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["business-dashboard"] }),
      ]);
      toast.success(
        isVietnamese
          ? `Đã tạo sản phẩm "${created.name}" thành công!`
          : `Created product "${created.name}" successfully!`
      );
      onCustomExecuted?.(
        isVietnamese
          ? `✅ Đã tạo sản phẩm **${created.name}** (${created.unit}, ${created.defaultPrice.toLocaleString()} ${currency}) thành công!`
          : `✅ Successfully created product **${created.name}** (${created.unit}, ${created.defaultPrice.toLocaleString()} ${currency})!`
      );
    } catch (err: unknown) {
      toast.error(
        apiError(err, isVietnamese ? "Không thể tạo sản phẩm." : "Failed to create product.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || isSubmitting || busy) return;
    setIsSubmitting(true);
    try {
      const created = await businessService.createCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        address: customerAddress.trim() || undefined,
        email: customerEmail.trim() || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["business-dashboard"] }),
      ]);
      toast.success(
        isVietnamese
          ? `Đã tạo khách hàng "${created.name}" thành công!`
          : `Created customer "${created.name}" successfully!`
      );
      onCustomExecuted?.(
        isVietnamese
          ? `✅ Đã tạo khách hàng **${created.name}**${created.phone ? ` (SĐT: ${created.phone})` : ""} thành công!`
          : `✅ Successfully created customer **${created.name}**${created.phone ? ` (Phone: ${created.phone})` : ""}!`
      );
    } catch (err: unknown) {
      toast.error(
        apiError(err, isVietnamese ? "Không thể tạo khách hàng." : "Failed to create customer.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || isSubmitting || busy) return;
    setIsSubmitting(true);
    try {
      const created = await businessService.createSupplier({
        name: supplierName.trim(),
        phone: supplierPhone.trim() || undefined,
        address: supplierAddress.trim() || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
        queryClient.invalidateQueries({ queryKey: ["business-dashboard"] }),
      ]);
      toast.success(
        isVietnamese
          ? `Đã tạo nhà cung cấp "${created.name}" thành công!`
          : `Created supplier "${created.name}" successfully!`
      );
      onCustomExecuted?.(
        isVietnamese
          ? `✅ Đã tạo nhà cung cấp **${created.name}**${created.phone ? ` (SĐT: ${created.phone})` : ""} thành công!`
          : `✅ Successfully created supplier **${created.name}**${created.phone ? ` (Phone: ${created.phone})` : ""}!`
      );
    } catch (err: unknown) {
      toast.error(
        apiError(err, isVietnamese ? "Không thể tạo nhà cung cấp." : "Failed to create supplier.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0 || isSubmitting || busy) return;
    setIsSubmitting(true);
    try {
      const created = await businessService.createBusinessExpense({
        category: expenseCategory.trim() || (isVietnamese ? "Chi phí khác" : "Other"),
        amount: expenseAmount,
        description: expenseDescription.trim() || undefined,
        expenseDate: new Date().toISOString(),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["business-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["business-dashboard"] }),
      ]);
      toast.success(
        isVietnamese
          ? `Đã ghi nhận chi phí ${created.amount.toLocaleString()} ${currency}!`
          : `Recorded expense ${created.amount.toLocaleString()} ${currency}!`
      );
      onCustomExecuted?.(
        isVietnamese
          ? `✅ Đã ghi nhận chi phí **${created.category}** số tiền **${created.amount.toLocaleString()} ${currency}**!`
          : `✅ Successfully recorded expense **${created.category}** for **${created.amount.toLocaleString()} ${currency}**!`
      );
    } catch (err: unknown) {
      toast.error(
        apiError(err, isVietnamese ? "Không thể ghi nhận chi phí." : "Failed to record expense.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustText.trim()) {
      onReply?.(adjustText.trim());
      setAdjustText("");
    }
  };

  // 1. Settled State (Completed or Cancelled)
  if (isSettled) {
    return (
      <div className="mt-3.5 rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs">
        <div className="flex items-center gap-2">
          {proposal.status === "Executed" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-foreground">
            {proposal.status === "Executed"
              ? isVietnamese
                ? "Giao dịch đã được ghi nhận vào hệ thống."
                : "Transaction successfully recorded."
              : isVietnamese
              ? "Thao tác đã được hủy bỏ."
              : "Action was cancelled."}
          </span>
        </div>
      </div>
    );
  }

  // 2. Interactive Product Creation / Editing Form
  if (proposal.intent === "create_product" || proposal.intent === "update_product") {
    return (
      <form
        onSubmit={handleCreateProduct}
        className="mt-3.5 rounded-xl border border-emerald-300/70 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/25"
      >
        <div className="flex items-start gap-2.5">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {isVietnamese ? "Thông tin sản phẩm" : "Product Details"}
              </span>
              <span className="rounded bg-emerald-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                {proposal.riskLevel}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{proposal.summary}</p>

            <div className="mt-3 space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  {isVietnamese ? "Tên sản phẩm *" : "Product Name *"}
                </label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={isSubmitting || busy}
                  placeholder={
                    isVietnamese
                      ? "Nhập tên sản phẩm (ví dụ: Cà phê sữa, Trà đào)..."
                      : "Enter product name (e.g. Cappuccino, Green Tea)..."
                  }
                  className="h-8 text-xs bg-background"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {isVietnamese ? "Đơn vị tính" : "Unit"}
                  </label>
                  <Input
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    disabled={isSubmitting || busy}
                    placeholder={isVietnamese ? "ly, cái, hộp, kg..." : "item, cup, box..."}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {isVietnamese ? `Giá bán (${currency})` : `Default Price (${currency})`}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={productPrice === 0 ? "" : productPrice}
                    onChange={(e) =>
                      setProductPrice(Math.max(0, Number(e.target.value) || 0))
                    }
                    disabled={isSubmitting || busy}
                    placeholder="0"
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || busy}
                onClick={() => onDecision(false)}
                className="h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!productName.trim() || isSubmitting || busy}
                onClick={handleCreateProduct}
                className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {isVietnamese ? "Lưu & Tạo sản phẩm" : "Save & Create Product"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  // 3. Interactive Customer Creation / Editing Form
  if (proposal.intent === "create_customer" || proposal.intent === "update_customer") {
    return (
      <form
        onSubmit={handleCreateCustomer}
        className="mt-3.5 rounded-xl border border-sky-300/70 bg-sky-50/70 p-3.5 dark:border-sky-900/60 dark:bg-sky-950/25"
      >
        <div className="flex items-start gap-2.5">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                {isVietnamese ? "Thông tin khách hàng" : "Customer Details"}
              </span>
              <span className="rounded bg-sky-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                {proposal.riskLevel}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{proposal.summary}</p>

            <div className="mt-3 space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  {isVietnamese ? "Tên khách hàng *" : "Customer Name *"}
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isSubmitting || busy}
                  placeholder={
                    isVietnamese
                      ? "Nhập tên khách hàng (ví dụ: Chị Lan, Anh Nam)..."
                      : "Enter customer name (e.g. Sarah Connor)..."
                  }
                  className="h-8 text-xs bg-background"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {isVietnamese ? "Số điện thoại" : "Phone"}
                  </label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={isSubmitting || busy}
                    placeholder={isVietnamese ? "0912..." : "Phone..."}
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {isVietnamese ? "Địa chỉ" : "Address"}
                  </label>
                  <Input
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    disabled={isSubmitting || busy}
                    placeholder={isVietnamese ? "Địa chỉ..." : "Address..."}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || busy}
                onClick={() => onDecision(false)}
                className="h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!customerName.trim() || isSubmitting || busy}
                onClick={handleCreateCustomer}
                className="h-8 text-xs gap-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {isVietnamese ? "Lưu & Tạo khách hàng" : "Save & Create Customer"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  // 4. Interactive Supplier Creation / Editing Form
  if (proposal.intent === "create_supplier" || proposal.intent === "update_supplier") {
    return (
      <form
        onSubmit={handleCreateSupplier}
        className="mt-3.5 rounded-xl border border-violet-300/70 bg-violet-50/70 p-3.5 dark:border-violet-900/60 dark:bg-violet-950/25"
      >
        <div className="flex items-start gap-2.5">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                {isVietnamese ? "Thông tin nhà cung cấp" : "Supplier Details"}
              </span>
              <span className="rounded bg-violet-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-900/60 dark:text-violet-300">
                {proposal.riskLevel}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{proposal.summary}</p>

            <div className="mt-3 space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  {isVietnamese ? "Tên nhà cung cấp *" : "Supplier Name *"}
                </label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  disabled={isSubmitting || busy}
                  placeholder={
                    isVietnamese
                      ? "Nhập tên nhà cung cấp (ví dụ: Đại lý Vinamilk)..."
                      : "Enter supplier name (e.g. Acme Supplies)..."
                  }
                  className="h-8 text-xs bg-background"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {isVietnamese ? "Số điện thoại" : "Phone"}
                  </label>
                  <Input
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    disabled={isSubmitting || busy}
                    placeholder={isVietnamese ? "09..." : "Phone..."}
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {isVietnamese ? "Địa chỉ" : "Address"}
                  </label>
                  <Input
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    disabled={isSubmitting || busy}
                    placeholder={isVietnamese ? "Địa chỉ..." : "Address..."}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || busy}
                onClick={() => onDecision(false)}
                className="h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!supplierName.trim() || isSubmitting || busy}
                onClick={handleCreateSupplier}
                className="h-8 text-xs gap-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {isVietnamese ? "Lưu & Tạo nhà cung cấp" : "Save & Create Supplier"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  // 5. Interactive Expense Recording Form
  if (proposal.intent === "expense") {
    return (
      <form
        onSubmit={handleCreateExpense}
        className="mt-3.5 rounded-xl border border-rose-300/70 bg-rose-50/70 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/25"
      >
        <div className="flex items-start gap-2.5">
          <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                {isVietnamese ? "Ghi nhận chi phí" : "Record Expense"}
              </span>
              <span className="rounded bg-rose-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
                {proposal.riskLevel}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{proposal.summary}</p>

            <div className="mt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {isVietnamese ? "Danh mục chi" : "Category"}
                  </label>
                  <Input
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    disabled={isSubmitting || busy}
                    placeholder={isVietnamese ? "Tiền điện, nước..." : "Rent, utilities..."}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    {isVietnamese ? `Số tiền (${currency}) *` : `Amount (${currency}) *`}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={expenseAmount === 0 ? "" : expenseAmount}
                    onChange={(e) =>
                      setExpenseAmount(Math.max(0, Number(e.target.value) || 0))
                    }
                    disabled={isSubmitting || busy}
                    placeholder="0"
                    className="h-8 text-xs bg-background font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {isVietnamese ? "Ghi chú / Diễn giải" : "Description / Notes"}
                </label>
                <Input
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  disabled={isSubmitting || busy}
                  placeholder={isVietnamese ? "Chi tiết nội dung chi..." : "Description..."}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || busy}
                onClick={() => onDecision(false)}
                className="h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={expenseAmount <= 0 || isSubmitting || busy}
                onClick={handleCreateExpense}
                className="h-8 text-xs gap-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {isVietnamese ? "Xác nhận & Ghi chi phí" : "Confirm & Record Expense"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  // 6. Generic Clarification Needed (e.g. Ambiguous customer or product matching)
  const isClarification = proposal.status === "NeedsClarification" || !proposal.actionId;
  if (isClarification) {
    return (
      <div className="mt-3.5 rounded-xl border border-sky-300/70 bg-sky-50/80 p-3.5 dark:border-sky-900/60 dark:bg-sky-950/25">
        <div className="flex items-start gap-2">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                {isVietnamese ? "Cần thêm thông tin" : "Clarification Needed"}
              </span>
            </div>

            <p className="mt-1 font-semibold text-foreground text-sm">{proposal.summary}</p>

            {proposal.candidates && proposal.candidates.length > 0 && (
              <div className="mt-2.5 space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese ? "Chọn một gợi ý:" : "Select an option:"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {proposal.candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onReply?.(c.label)}
                      className="rounded-lg border bg-background px-2.5 py-1 text-xs font-semibold hover:border-primary hover:bg-accent"
                    >
                      {c.label} {c.detail ? <span className="text-muted-foreground">({c.detail})</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Direct in-card typing */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (clarifyText.trim()) {
                  onReply?.(clarifyText.trim());
                  setClarifyText("");
                }
              }}
              className="mt-3 flex gap-2"
            >
              <Input
                value={clarifyText}
                onChange={(e) => setClarifyText(e.target.value)}
                disabled={busy}
                placeholder={
                  isVietnamese
                    ? "Nhập câu trả lời trực tiếp tại đây..."
                    : "Type your answer directly here..."
                }
                className="h-8 text-xs bg-background"
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                disabled={!clarifyText.trim() || busy}
                className="h-8 gap-1 text-xs shrink-0"
              >
                <Send className="h-3 w-3" />
                <span>{isVietnamese ? "Gửi" : "Send"}</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 7. General Financial Proposal (Sale, Debt Payment, Purchase, Supplier Payment, etc.)
  return (
    <div className="mt-3.5 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {isVietnamese ? "Đề xuất giao dịch" : "Proposed Action"}
            </span>
            <span className="rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
              {proposal.riskLevel}
            </span>
          </div>

          <p className="mt-1 font-semibold text-foreground text-sm">{proposal.summary}</p>

          {Object.keys(proposal.details).length > 0 && (
            <dl className="mt-2.5 grid gap-1.5 text-xs sm:grid-cols-2">
              {Object.entries(proposal.details)
                .filter(([, v]) => v)
                .map(([label, val]) => (
                  <div
                    key={label}
                    className="rounded bg-background/80 p-2 border border-border/40"
                  >
                    <dt className="text-[10px] text-muted-foreground">{label}</dt>
                    <dd className="font-semibold text-foreground truncate text-xs">{val}</dd>
                  </div>
                ))}
            </dl>
          )}

          {/* Quick inline adjustment input */}
          <form onSubmit={handleQuickAdjust} className="mt-2.5 flex gap-1.5">
            <Input
              value={adjustText}
              onChange={(e) => setAdjustText(e.target.value)}
              disabled={busy}
              placeholder={
                isVietnamese
                  ? "Cần điều chỉnh gì? (Ví dụ: khách nợ, giảm 20k, đổi số lượng)..."
                  : "Need adjustment? (e.g. discount 20k, customer credit)..."
              }
              className="h-8 text-xs bg-background"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={!adjustText.trim() || busy}
              className="h-8 text-xs shrink-0"
            >
              <Send className="h-3 w-3 mr-1" />
              {isVietnamese ? "Gửi" : "Send"}
            </Button>
          </form>

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Bấm nút hoặc gõ 'đồng ý' / 'hủy' trong ô chat."
                : "Click a button or reply 'yes' / 'cancel' in chat."}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onDecision(false)}
                className="h-8 gap-1 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => onDecision(true)}
                className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs shadow-sm font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isVietnamese ? "Xác nhận & Ghi sổ" : "Approve & Record"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
