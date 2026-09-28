import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiActionInputOverrides, AiActionProposalResponse } from "@/services/aiService";

export interface InteractiveProposalCardProps {
  proposal: AiActionProposalResponse;
  busy: boolean;
  isVietnamese: boolean;
  currency?: string;
  onDecision: (confirmed: boolean, input?: AiActionInputOverrides) => Promise<boolean> | boolean;
  onReply?: (text: string) => void;
}

function detail(proposal: AiActionProposalResponse, ...keys: string[]): string {
  const entries = Object.entries(proposal.details);
  for (const key of keys) {
    const found = entries.find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
    if (found?.[1]) return found[1];
  }
  return "";
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

function completedContext(
  proposal: AiActionProposalResponse,
  isVietnamese: boolean,
): Array<[string, string]> {
  const fields: Array<[string, string, string[]]> = [];
  if (["create_customer", "update_customer", "archive_customer"].includes(proposal.intent)) {
    fields.push(
      [isVietnamese ? "Khách hàng" : "Customer", "Name", ["Name", "Customer", "CustomerName"]],
      [isVietnamese ? "Điện thoại" : "Phone", "Phone", ["Phone"]],
      ["Email", "Email", ["Email"]],
      [isVietnamese ? "Địa chỉ" : "Address", "Address", ["Address"]],
    );
  } else if (["create_product", "update_product", "archive_product"].includes(proposal.intent)) {
    fields.push(
      [isVietnamese ? "Sản phẩm" : "Product", "Name", ["Name", "Product", "ProductName"]],
      [isVietnamese ? "Đơn vị" : "Unit", "Unit", ["Unit"]],
      [isVietnamese ? "Giá" : "Price", "UnitPrice", ["UnitPrice", "Default price", "Price"]],
    );
  } else if (["create_supplier", "update_supplier", "archive_supplier"].includes(proposal.intent)) {
    fields.push(
      [isVietnamese ? "Nhà cung cấp" : "Supplier", "Name", ["Name", "Supplier", "SupplierName"]],
      [isVietnamese ? "Điện thoại" : "Phone", "Phone", ["Phone"]],
      ["Email", "Email", ["Email"]],
      [isVietnamese ? "Địa chỉ" : "Address", "Address", ["Address"]],
    );
  } else if (proposal.intent === "expense") {
    fields.push(
      [isVietnamese ? "Danh mục" : "Category", "Category", ["Category"]],
      [isVietnamese ? "Số tiền" : "Amount", "Amount", ["Amount"]],
      [isVietnamese ? "Mô tả" : "Description", "Description", ["Description"]],
    );
  } else if (proposal.intent === "sale" || proposal.intent === "purchase") {
    fields.push(
      [isVietnamese ? "Khách hàng" : "Customer", "CustomerName", ["Customer", "CustomerName", "Supplier", "SupplierName"]],
      [isVietnamese ? "Mặt hàng" : "Item", "ProductName", ["Product", "ProductName"]],
      [isVietnamese ? "Số lượng" : "Quantity", "Quantity", ["Quantity"]],
      [isVietnamese ? "Tổng tiền" : "Total", "Amount", ["Total", "Amount"]],
    );
  } else if (proposal.intent.includes("payment")) {
    fields.push(
      [isVietnamese ? "Đối tượng" : "Account", "Account", ["CustomerName", "SupplierName", "Customer", "Supplier"]],
      [isVietnamese ? "Số tiền" : "Amount", "Amount", ["Amount"]],
    );
  } else if (proposal.intent === "update_settings") {
    fields.push([isVietnamese ? "Tiền tệ" : "Currency", "Currency", ["Currency"]]);
  }

  const seen = new Set<string>();
  return fields.flatMap(([label, fallback, keys]) => {
    const value = detail(proposal, ...keys);
    const normalized = value.trim();
    if (!normalized || normalized === "0" || seen.has(`${label}:${normalized}`)) return [];
    seen.add(`${label}:${normalized}`);
    return [[label || fallback, normalized] as [string, string]];
  });
}

export function InteractiveProposalCard({
  proposal,
  busy,
  isVietnamese,
  currency = "VND",
  onDecision,
  onReply,
}: InteractiveProposalCardProps) {
  const isTerminal = ["Executed", "Cancelled", "Expired", "Failed"].includes(proposal.status);
  const isProcessing = proposal.status === "Executing";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locallyDismissed, setLocallyDismissed] = useState(false);

  // Product Form State
  const [productName, setProductName] = useState(() =>
    cleanInitialName(
      detail(proposal, "Product", "Name", "Tên sản phẩm")
    )
  );
  const [productUnit, setProductUnit] = useState(
    () => detail(proposal, "Unit", "Đơn vị tính") || "item"
  );
  const [productPrice, setProductPrice] = useState<number>(() =>
    parseInitialPrice(detail(proposal, "Default price", "Price", "UnitPrice", "Giá mặc định"))
  );
  const productPriceRequired = detail(proposal, "Price required") === "true";
  const moneyStep = currency.toUpperCase() === "VND" ? "1000" : "0.01";

  // Customer Form State
  const [customerName, setCustomerName] = useState(() =>
    cleanInitialName(
      detail(proposal, "Name", "Customer", "Tên khách hàng")
    )
  );
  const [customerPhone, setCustomerPhone] = useState(
    () => detail(proposal, "Phone", "Số điện thoại")
  );
  const [customerAddress, setCustomerAddress] = useState(
    () => detail(proposal, "Address", "Địa chỉ")
  );
  const [customerEmail, setCustomerEmail] = useState(
    () => detail(proposal, "Email")
  );

  // Supplier Form State
  const [supplierName, setSupplierName] = useState(() =>
    cleanInitialName(
      detail(proposal, "Name", "Supplier", "Tên nhà cung cấp")
    )
  );
  const [supplierPhone, setSupplierPhone] = useState(
    () => detail(proposal, "Phone", "Số điện thoại")
  );
  const [supplierAddress, setSupplierAddress] = useState(
    () => detail(proposal, "Address", "Địa chỉ")
  );
  const [supplierEmail, setSupplierEmail] = useState(
    () => detail(proposal, "Email")
  );

  // Expense Form State
  const [expenseCategory, setExpenseCategory] = useState(
    () =>
      detail(proposal, "Category", "Danh mục") ||
      (isVietnamese ? "Chi phí vận hành" : "Operating Expense")
  );
  const [expenseAmount, setExpenseAmount] = useState<number>(() =>
    parseInitialPrice(detail(proposal, "Amount", "Số tiền"))
  );
  const [expenseDescription, setExpenseDescription] = useState(
    () => detail(proposal, "Description", "Mô tả")
  );

  // Refinement / Clarification
  const [adjustText, setAdjustText] = useState("");
  const [clarifyText, setClarifyText] = useState("");

  // Handlers for direct submission
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || (productPriceRequired && productPrice <= 0) || isSubmitting || busy) return;
    setIsSubmitting(true);
    try {
      const input: AiActionInputOverrides = {
        name: productName.trim(),
        unit: productUnit.trim() || "item",
        unitPrice: productPrice,
      };
      if (proposal.actionId) await onDecision(true, input);
      else {
        setLocallyDismissed(true);
        const pendingSale = detail(proposal, "Pending sale");
        onReply?.(
          `Create product ${input.name}, unit ${input.unit}, price ${input.unitPrice ?? 0} ${currency}` +
          (pendingSale ? `. After creating it, continue pending sale: ${pendingSale}` : "")
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || isSubmitting || busy) return;
    setIsSubmitting(true);
    try {
      const input: AiActionInputOverrides = {
        name: customerName.trim(),
        phone: customerPhone.trim() || null,
        address: customerAddress.trim() || null,
        email: customerEmail.trim() || null,
      };
      if (proposal.actionId) await onDecision(true, input);
      else {
        setLocallyDismissed(true);
        onReply?.(`Create customer ${input.name}${input.phone ? `, phone ${input.phone}` : ""}${input.address ? `, address ${input.address}` : ""}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || isSubmitting || busy) return;
    setIsSubmitting(true);
    try {
      const input: AiActionInputOverrides = {
        name: supplierName.trim(),
        phone: supplierPhone.trim() || null,
        email: supplierEmail.trim() || null,
        address: supplierAddress.trim() || null,
      };
      if (proposal.actionId) await onDecision(true, input);
      else {
        setLocallyDismissed(true);
        onReply?.(`Create supplier ${input.name}${input.phone ? `, phone ${input.phone}` : ""}${input.address ? `, address ${input.address}` : ""}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0 || isSubmitting || busy) return;
    setIsSubmitting(true);
    try {
      const input: AiActionInputOverrides = {
        category: expenseCategory.trim() || (isVietnamese ? "Chi phí khác" : "Other"),
        amount: expenseAmount,
        description: expenseDescription.trim() || null,
      };
      if (proposal.actionId) await onDecision(true, input);
      else {
        setLocallyDismissed(true);
        onReply?.(`Record ${input.amount} ${currency} expense for ${input.category}${input.description ? `, ${input.description}` : ""}`);
      }
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

  const handleDismiss = () => {
    if (proposal.actionId) void onDecision(false);
    else setLocallyDismissed(true);
  };

  if (locallyDismissed) return null;

  // 1. Terminal / processing state
  if (isTerminal || isProcessing) {
    const resultMessage = detail(proposal, "Result");
    const statusMessage = proposal.status === "Executed"
      ? (resultMessage || proposal.summary)
      : proposal.status === "Cancelled"
        ? (isVietnamese ? "Thao tác đã được hủy bỏ." : "Action was cancelled.")
        : proposal.status === "Expired"
          ? (isVietnamese ? "Đề xuất đã hết hạn. Hãy yêu cầu Tenvora chuẩn bị lại." : "This proposal expired. Ask Tenvora to prepare it again.")
          : proposal.status === "Failed"
            ? (isVietnamese ? "Thao tác không thể hoàn tất. Hãy kiểm tra và thử lại bằng yêu cầu mới." : "This action could not be completed. Review it and try a new request.")
            : (isVietnamese ? "Thao tác đang được xử lý…" : "This action is being processed…");
    const context = proposal.status === "Executed" ? completedContext(proposal, isVietnamese) : [];
    return (
      <div className="mt-3.5 rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs">
        <div className="flex items-start gap-2.5">
          {proposal.status === "Executed" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : proposal.status === "Executing" ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {proposal.status === "Executed"
                ? (isVietnamese ? "Đã hoàn tất" : "Completed")
                : proposal.status}
            </span>
            <p className="mt-0.5 font-semibold text-foreground">{statusMessage}</p>
            {context.length > 0 && (
              <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {context.map(([label, value]) => (
                  <div key={`${label}-${value}`} className="rounded-md border border-border/40 bg-background/70 px-2 py-1.5">
                    <dt className="text-[10px] text-muted-foreground">{label}</dt>
                    <dd className="truncate font-semibold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
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
                    {isVietnamese
                      ? `Giá bán (${currency})${productPriceRequired ? " *" : ""}`
                      : `Default Price (${currency})${productPriceRequired ? " *" : ""}`}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step={moneyStep}
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
                onClick={handleDismiss}
                className="h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!productName.trim() || (productPriceRequired && productPrice <= 0) || isSubmitting || busy}
                className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {proposal.intent === "update_product"
                  ? (isVietnamese ? "Lưu thay đổi" : "Save Changes")
                  : (isVietnamese ? "Lưu & Tạo sản phẩm" : "Save & Create Product")}
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
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={isSubmitting || busy}
                  placeholder="Email..."
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
                onClick={handleDismiss}
                className="h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!customerName.trim() || isSubmitting || busy}
                className="h-8 text-xs gap-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {proposal.intent === "update_customer"
                  ? (isVietnamese ? "Lưu thay đổi" : "Save Changes")
                  : (isVietnamese ? "Lưu & Tạo khách hàng" : "Save & Create Customer")}
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
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  disabled={isSubmitting || busy}
                  placeholder="Email..."
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
                onClick={handleDismiss}
                className="h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!supplierName.trim() || isSubmitting || busy}
                className="h-8 text-xs gap-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {proposal.intent === "update_supplier"
                  ? (isVietnamese ? "Lưu thay đổi" : "Save Changes")
                  : (isVietnamese ? "Lưu & Tạo nhà cung cấp" : "Save & Create Supplier")}
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
                    step={moneyStep}
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
                onClick={handleDismiss}
                className="h-8 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {isVietnamese ? "Hủy" : "Dismiss"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={expenseAmount <= 0 || isSubmitting || busy}
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
                onClick={handleDismiss}
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
