import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  PackageCheck,
  RotateCcw,
  Upload,
  Users,
  Truck,
  ReceiptText,
  PackageOpen,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessPermissions } from "@/hooks/useBusinessPermissions";
import {
  ImportKind,
  ParsedImportRow,
  downloadImportTemplate,
  importDate,
  importDefinitions,
  importNumber,
  importString,
  normalizeImportText,
  readImportFile,
} from "@/lib/dataImport";
import {
  BusinessCustomer,
  Product,
  Supplier,
  apiError,
  businessService,
} from "@/services/businessService";

type RowState = "ready" | "skip" | "error" | "imported" | "failed";

interface AnalyzedRow extends ParsedImportRow {
  errors: string[];
  warnings: string[];
  state: RowState;
}

interface ImportRunResult {
  imported: number;
  skipped: number;
  failed: number;
}

const importIcons = {
  customers: Users,
  suppliers: Truck,
  products: PackageCheck,
  sales: ReceiptText,
  purchases: PackageOpen,
  expenses: WalletCards,
} satisfies Record<ImportKind, typeof Users>;

const importKinds = Object.keys(importDefinitions) as ImportKind[];

const vietnameseImportCopy: Record<ImportKind, { label: string; description: string }> = {
  customers: { label: "Khách hàng", description: "Danh bạ khách hàng và thông tin liên hệ." },
  suppliers: { label: "Nhà cung cấp", description: "Danh bạ nhà cung cấp và thông tin liên hệ." },
  products: { label: "Hàng hoá & tồn kho", description: "Danh mục, giá bán, giá vốn, tồn đầu kỳ và mức tồn tối thiểu." },
  sales: { label: "Hóa đơn bán hàng", description: "Mỗi dòng là một mặt hàng; các dòng cùng mã chứng từ tạo thành một đơn bán." },
  purchases: { label: "Hóa đơn mua hàng", description: "Mỗi dòng là một mặt hàng; hàng liên kết sẽ tự động tăng tồn kho." },
  expenses: { label: "Chi phí", description: "Các khoản chi phí hoạt động hiện tại hoặc trong quá khứ." },
};

function text(value: unknown) {
  return importString(value as never);
}

function appendImportReference(notes: string, reference: string) {
  const marker = `[Imported ref: ${reference}]`;
  return notes ? `${notes}\n${marker}` : marker;
}

function uniqueMatch<T>(items: T[], value: string, selector: (item: T) => string): T | undefined {
  const key = normalizeImportText(value);
  if (!key) return undefined;
  const matches = items.filter((item) => normalizeImportText(selector(item)) === key);
  return matches.length === 1 ? matches[0] : undefined;
}

function matchProduct(products: Product[], name: string, sku: string): Product | undefined {
  if (sku) {
    const bySku = products.filter((product) => normalizeImportText(product.sku) === normalizeImportText(sku));
    if (bySku.length === 1) return bySku[0];
  }
  return uniqueMatch(products, name, (product) => product.name);
}

export default function DataImportsPage() {
  const { isVietnamese } = useLanguage();
  const { canManageRecords } = useBusinessPermissions();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const requestedKind = params.get("type") as ImportKind | null;
  const [kind, setKindState] = useState<ImportKind>(requestedKind && importKinds.includes(requestedKind) ? requestedKind : "products");
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [rowResults, setRowResults] = useState<Record<number, RowState>>({});
  const [runResult, setRunResult] = useState<ImportRunResult | null>(null);

  const { data: customers = [] } = useQuery({ queryKey: ["customers", "import-all"], queryFn: () => businessService.getCustomers("", "Active"), enabled: canManageRecords });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers", "import-all"], queryFn: () => businessService.getSuppliers("", "Active"), enabled: canManageRecords });
  const { data: products = [] } = useQuery({ queryKey: ["products", "import-all"], queryFn: () => businessService.getProducts("", true), enabled: canManageRecords });
  const { data: sales = [] } = useQuery({ queryKey: ["sales", "import-existing"], queryFn: () => businessService.getSales(), enabled: canManageRecords });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases", "import-existing"], queryFn: () => businessService.getPurchases(), enabled: canManageRecords });

  const copy = (english: string, vietnamese: string) => isVietnamese ? vietnamese : english;
  const definition = importDefinitions[kind];

  const resetFile = () => {
    setRows([]);
    setFileName("");
    setFileError("");
    setRowResults({});
    setRunResult(null);
    setProgress({ current: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectKind = (next: ImportKind) => {
    setKindState(next);
    setParams({ type: next }, { replace: true });
    resetFile();
  };

  const analyzedRows = useMemo<AnalyzedRow[]>(() => {
    const seen = new Set<string>();
    const existingCustomerKeys = new Set(customers.map((item) => normalizeImportText(item.name)));
    const existingSupplierKeys = new Set(suppliers.map((item) => normalizeImportText(item.name)));
    const existingProductKeys = new Set(products.flatMap((item) => [
      `name:${normalizeImportText(item.name)}`,
      ...(item.sku ? [`sku:${normalizeImportText(item.sku)}`] : []),
    ]));

    return rows.map((row) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const data = row.data;
      let state: RowState = "ready";
      const required = definition.fields.filter((field) => field.required && !text(data[field.key]));
      if (required.length) errors.push(`Missing ${required.map((field) => field.label).join(", ")}`);

      if ((kind === "customers" || kind === "suppliers") && text(data.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(data.email))) {
        errors.push("Invalid email address");
      }

      if (kind === "customers" || kind === "suppliers") {
        const key = normalizeImportText(data.name);
        const existing = kind === "customers" ? existingCustomerKeys : existingSupplierKeys;
        if (key && (existing.has(key) || seen.has(key))) {
          warnings.push("Already exists; this row will be skipped");
          state = "skip";
        }
        if (key) seen.add(key);
      }

      if (kind === "products") {
        const keys = [
          `name:${normalizeImportText(data.name)}`,
          ...(text(data.sku) ? [`sku:${normalizeImportText(data.sku)}`] : []),
        ];
        for (const field of ["defaultPrice", "costPrice", "stockQuantity", "minStockLevel"] as const) {
          const value = text(data[field]);
          if (value && (importNumber(data[field]) === null || importNumber(data[field])! < 0)) errors.push(`${definition.fields.find((item) => item.key === field)?.label} must be zero or greater`);
        }
        if (keys.some((key) => key !== "name:" && (existingProductKeys.has(key) || seen.has(key)))) {
          warnings.push("SKU or product already exists; this row will be skipped");
          state = "skip";
        }
        keys.forEach((key) => seen.add(key));
      }

      if (kind === "expenses") {
        const amount = importNumber(data.amount);
        if (amount === null || amount <= 0) errors.push("Amount must be greater than zero");
        if (text(data.date) && !importDate(data.date)) errors.push("Date is not recognized");
      }

      if (kind === "sales") {
        const customerName = text(data.customer);
        const product = matchProduct(products, text(data.product), text(data.sku));
        if (customerName && !uniqueMatch(customers, customerName, (item) => item.name)) errors.push(`Customer “${customerName}” was not found or is ambiguous`);
        if ((text(data.product) || text(data.sku)) && !product) errors.push(`Product “${text(data.sku) || text(data.product)}” was not found or is ambiguous`);
        if (!text(data.product) && !text(data.sku)) errors.push("Product or SKU is required");
        const quantity = importNumber(data.quantity);
        if (quantity === null || quantity <= 0) errors.push("Quantity must be greater than zero");
        const price = text(data.unitPrice) ? importNumber(data.unitPrice) : product?.defaultPrice;
        if (price === null || price === undefined || price < 0) errors.push("Unit price is invalid");
        if (text(data.paidAmount) && (importNumber(data.paidAmount) === null || importNumber(data.paidAmount)! < 0)) errors.push("Paid amount is invalid");
        if (text(data.date) && !importDate(data.date)) errors.push("Date is not recognized");
        const reference = text(data.documentRef);
        if (reference && sales.some((sale) => sale.notes?.includes(`[Imported ref: ${reference}]`))) {
          warnings.push("This document reference was already imported");
          state = "skip";
        }
      }

      if (kind === "purchases") {
        const supplierName = text(data.supplier);
        const hasProduct = Boolean(text(data.product) || text(data.sku));
        if (supplierName && !uniqueMatch(suppliers, supplierName, (item) => item.name)) errors.push(`Supplier “${supplierName}” was not found or is ambiguous`);
        if (hasProduct && !matchProduct(products, text(data.product), text(data.sku))) errors.push(`Product “${text(data.sku) || text(data.product)}” was not found or is ambiguous`);
        if (!hasProduct && !text(data.description)) errors.push("Product or description is required");
        const quantity = importNumber(data.quantity);
        const cost = importNumber(data.unitCost);
        if (quantity === null || quantity <= 0) errors.push("Quantity must be greater than zero");
        if (cost === null || cost < 0) errors.push("Unit cost must be zero or greater");
        if (text(data.paidAmount) && (importNumber(data.paidAmount) === null || importNumber(data.paidAmount)! < 0)) errors.push("Paid amount is invalid");
        if (text(data.date) && !importDate(data.date)) errors.push("Date is not recognized");
        const reference = text(data.documentRef);
        if (reference && purchases.some((purchase) => purchase.notes?.includes(`[Imported ref: ${reference}]`))) {
          warnings.push("This document reference was already imported");
          state = "skip";
        }
      }

      if (errors.length > 0) state = "error";
      if (rowResults[row.rowNumber]) state = rowResults[row.rowNumber];
      return { ...row, errors, warnings, state };
    });
  }, [customers, definition.fields, kind, products, purchases, rowResults, rows, sales, suppliers]);

  const documentErrors = useMemo(() => {
    if (kind !== "sales" && kind !== "purchases") return new Map<string, string>();
    const messages = new Map<string, string>();
    const groups = new Map<string, AnalyzedRow[]>();
    for (const row of analyzedRows) {
      const reference = text(row.data.documentRef);
      if (!reference) continue;
      groups.set(reference, [...(groups.get(reference) ?? []), row]);
    }
    for (const [reference, group] of groups) {
      const errors: string[] = [];
      const partyKey = kind === "sales" ? "customer" : "supplier";
      const parties = new Set(group.map((row) => normalizeImportText(row.data[partyKey])).filter(Boolean));
      if (parties.size > 1) errors.push(`Rows use different ${partyKey}s`);
      const dates = new Set(group.map((row) => importDate(row.data.date)).filter(Boolean));
      if (dates.size > 1) errors.push("Rows use different dates");
      const paidAmounts = new Set(group.map((row) => text(row.data.paidAmount) ? importNumber(row.data.paidAmount) : null).filter((value) => value !== null));
      if (paidAmounts.size > 1) errors.push("Rows use different paid amounts; enter it on the first line only");
      const paidAmount = [...paidAmounts][0] ?? 0;
      const total = group.reduce((sum, row) => {
        const quantity = importNumber(row.data.quantity) ?? 0;
        if (kind === "sales") {
          const product = matchProduct(products, text(row.data.product), text(row.data.sku));
          const price = text(row.data.unitPrice) ? importNumber(row.data.unitPrice) ?? 0 : product?.defaultPrice ?? 0;
          return sum + quantity * price;
        }
        return sum + quantity * (importNumber(row.data.unitCost) ?? 0);
      }, 0);
      if (paidAmount > total) errors.push("Paid amount cannot exceed the document total");
      if (errors.length) messages.set(reference, `${reference}: ${errors.join("; ")}`);
    }
    return messages;
  }, [analyzedRows, kind, products]);

  const readyRows = analyzedRows.filter((row) => row.state === "ready" && !documentErrors.has(text(row.data.documentRef)));
  const errorCount = analyzedRows.filter((row) => row.state === "error" || documentErrors.has(text(row.data.documentRef))).length;
  const skipCount = analyzedRows.filter((row) => row.state === "skip").length;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsReading(true);
    setFileError("");
    setRows([]);
    setRowResults({});
    setRunResult(null);
    setFileName(file.name);
    try {
      const parsed = await readImportFile(file, definition);
      setRows(parsed);
      if (parsed.length === 0) setFileError(copy("No data rows were found.", "Không tìm thấy dòng dữ liệu nào."));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : copy("Could not read this file.", "Không thể đọc file này."));
    } finally {
      setIsReading(false);
    }
  };

  const markRows = (target: AnalyzedRow[], state: RowState) => {
    setRowResults((current) => {
      const next = { ...current };
      target.forEach((row) => { next[row.rowNumber] = state; });
      return next;
    });
  };

  const executeImport = async () => {
    if (!readyRows.length || isImporting) return;
    setIsImporting(true);
    setRunResult(null);
    let imported = 0;
    let failed = 0;

    const jobs: AnalyzedRow[][] = [];
    if (kind === "sales" || kind === "purchases") {
      const grouped = new Map<string, AnalyzedRow[]>();
      for (const row of readyRows) {
        const reference = text(row.data.documentRef);
        grouped.set(reference, [...(grouped.get(reference) ?? []), row]);
      }
      jobs.push(...grouped.values());
    } else {
      jobs.push(...readyRows.map((row) => [row]));
    }
    if (["sales", "purchases", "expenses"].includes(kind) && jobs.length > 100) {
      setIsImporting(false);
      setFileError(copy("Import at most 100 financial documents at a time so every record can be validated safely.", "Mỗi lần chỉ nhập tối đa 100 chứng từ tài chính để hệ thống kiểm tra an toàn từng bản ghi."));
      return;
    }
    setProgress({ current: 0, total: jobs.length });

    for (let index = 0; index < jobs.length; index++) {
      const group = jobs[index];
      try {
        const first = group[0].data;
        if (kind === "customers") {
          await businessService.createCustomer({ name: text(first.name), phone: text(first.phone) || undefined, email: text(first.email) || undefined, address: text(first.address) || undefined, notes: text(first.notes) || undefined });
        } else if (kind === "suppliers") {
          await businessService.createSupplier({ name: text(first.name), phone: text(first.phone) || undefined, email: text(first.email) || undefined, address: text(first.address) || undefined, notes: text(first.notes) || undefined });
        } else if (kind === "products") {
          await businessService.createProduct({
            name: text(first.name), sku: text(first.sku) || undefined, unit: text(first.unit),
            defaultPrice: importNumber(first.defaultPrice) ?? 0, costPrice: importNumber(first.costPrice) ?? 0,
            stockQuantity: importNumber(first.stockQuantity) ?? 0, minStockLevel: importNumber(first.minStockLevel) ?? undefined,
            notes: text(first.notes) || undefined,
          });
        } else if (kind === "expenses") {
          await businessService.createBusinessExpense({ category: text(first.category), amount: importNumber(first.amount)!, expenseDate: importDate(first.date), description: text(first.description) || undefined });
        } else if (kind === "sales") {
          const customer = uniqueMatch(customers, text(first.customer), (item) => item.name)!;
          const reference = text(first.documentRef);
          const paidRow = group.find((row) => text(row.data.paidAmount));
          const methodRow = group.find((row) => text(row.data.paymentMethod));
          const noteRow = group.find((row) => text(row.data.notes));
          await businessService.createSale({
            customerId: customer.id,
            items: group.map((row) => {
              const product = matchProduct(products, text(row.data.product), text(row.data.sku))!;
              return { productId: product.id, quantity: importNumber(row.data.quantity)!, unitPrice: text(row.data.unitPrice) ? importNumber(row.data.unitPrice)! : product.defaultPrice };
            }),
            paymentAmount: paidRow ? importNumber(paidRow.data.paidAmount) ?? 0 : 0,
            paymentMethod: methodRow ? text(methodRow.data.paymentMethod) : "Other",
            soldAt: importDate(first.date),
            notes: appendImportReference(noteRow ? text(noteRow.data.notes) : "", reference),
          });
        } else {
          const supplier = uniqueMatch(suppliers, text(first.supplier), (item) => item.name)!;
          const reference = text(first.documentRef);
          const paidRow = group.find((row) => text(row.data.paidAmount));
          const methodRow = group.find((row) => text(row.data.paymentMethod));
          const noteRow = group.find((row) => text(row.data.notes));
          await businessService.createPurchase({
            supplierId: supplier.id,
            items: group.map((row) => {
              const product = matchProduct(products, text(row.data.product), text(row.data.sku));
              return {
                productId: product?.id,
                description: text(row.data.description) || product?.name || text(row.data.product),
                unit: text(row.data.unit) || product?.unit || "item",
                quantity: importNumber(row.data.quantity)!,
                unitCost: importNumber(row.data.unitCost)!,
              };
            }),
            paymentAmount: paidRow ? importNumber(paidRow.data.paidAmount) ?? 0 : 0,
            paymentMethod: methodRow ? text(methodRow.data.paymentMethod) : "Other",
            purchasedAt: importDate(first.date),
            notes: appendImportReference(noteRow ? text(noteRow.data.notes) : "", reference),
          });
        }
        imported += 1;
        markRows(group, "imported");
      } catch (error) {
        failed += 1;
        markRows(group, "failed");
        toast.error(apiError(error, `${copy("Could not import", "Không thể nhập")} ${text(group[0].data.documentRef) || `${copy("row", "dòng")} ${group[0].rowNumber}`}`));
      }
      setProgress({ current: index + 1, total: jobs.length });
    }

    setIsImporting(false);
    setRunResult({ imported, skipped: skipCount, failed });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customers"] }), queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }), queryClient.invalidateQueries({ queryKey: ["sales"] }),
      queryClient.invalidateQueries({ queryKey: ["purchases"] }), queryClient.invalidateQueries({ queryKey: ["business-expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] }),
    ]);
    if (failed === 0) toast.success(copy(`Imported ${imported} ${kind === "sales" || kind === "purchases" ? "documents" : "records"}.`, `Đã nhập ${imported} ${kind === "sales" || kind === "purchases" ? "chứng từ" : "bản ghi"}.`));
  };

  const summary = (row: AnalyzedRow) => {
    if (kind === "customers" || kind === "suppliers" || kind === "products") return text(row.data.name);
    if (kind === "expenses") return `${text(row.data.category)} · ${text(row.data.amount)}`;
    return `${text(row.data.documentRef)} · ${text(row.data[kind === "sales" ? "customer" : "supplier"])} · ${text(row.data.product) || text(row.data.description)}`;
  };

  if (!canManageRecords) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            eyebrow={copy("Protected workspace", "Khu vực được bảo vệ")}
            title={copy("Data Import Center", "Trung tâm nhập dữ liệu")}
            description={copy(
              "Imports can create or change many financial records at once, so this page is available only to Tenant Admins and Operations Managers.",
              "Nhập dữ liệu có thể tạo hoặc thay đổi nhiều bản ghi tài chính cùng lúc, vì vậy trang này chỉ dành cho Quản trị viên doanh nghiệp và Quản lý vận hành."
            )}
          />
          <section className="paper-card flex items-start gap-4 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold">{copy("Import access is restricted", "Quyền nhập dữ liệu bị giới hạn")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy("You can continue viewing and exporting business records. Ask an administrator or operations manager to run an import.", "Bạn vẫn có thể xem và xuất dữ liệu kinh doanh. Hãy nhờ quản trị viên hoặc quản lý vận hành thực hiện nhập dữ liệu.")}
              </p>
            </div>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={copy("Bring your records with you", "Đưa dữ liệu hiện có vào Tenvora")}
          title={copy("Data Import Center", "Trung tâm nhập dữ liệu")}
          description={copy(
            "Import Excel or CSV lists with a safe preview. Sales, purchases, inventory, balances, and AI search use the imported records immediately.",
            "Nhập danh sách Excel hoặc CSV với bước xem trước an toàn. Bán hàng, mua hàng, tồn kho, công nợ và tìm kiếm AI sử dụng dữ liệu ngay sau khi nhập."
          )}
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={copy("Import type", "Loại dữ liệu nhập")}>
          {importKinds.map((item) => {
            const itemDefinition = importDefinitions[item];
            const itemCopy = isVietnamese ? vietnameseImportCopy[item] : itemDefinition;
            const Icon = importIcons[item];
            const selected = item === kind;
            return (
              <button key={item} type="button" onClick={() => selectKind(item)} className={`friendly-focus rounded-2xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary/8 shadow-sm" : "bg-card hover:border-primary/35 hover:bg-muted/30"}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}><Icon size={19} /></span>
                  <div><p className="text-sm font-bold">{itemCopy.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{itemCopy.description}</p></div>
                </div>
              </button>
            );
          })}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-bold">{isVietnamese ? vietnameseImportCopy[kind].label : definition.label}</p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy("Accepted files: .xlsx and UTF-8 .csv. Download the template for recognized column names.", "Định dạng hỗ trợ: .xlsx và .csv UTF-8. Tải file mẫu để dùng đúng tên cột.")}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => downloadImportTemplate(definition)} className="gap-2"><Download size={16} />{copy("Download template", "Tải file mẫu")}</Button>
          </div>

          <div className="mt-5 rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
            <FileSpreadsheet className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 text-sm font-bold">{fileName || copy("Choose an Excel or CSV file", "Chọn file Excel hoặc CSV")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{copy("Up to 5,000 rows. Nothing is recorded until you review and import.", "Tối đa 5.000 dòng. Chưa có dữ liệu nào được ghi trước khi bạn xem lại và xác nhận nhập.")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={isReading || isImporting} className="gap-2">
                {isReading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}{copy("Select file", "Chọn file")}
              </Button>
              {fileName && <Button type="button" variant="ghost" onClick={resetFile} disabled={isImporting} className="gap-2"><RotateCcw size={15} />{copy("Start over", "Làm lại")}</Button>}
            </div>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFile} />
          </div>

          {fileError && <div className="mt-4 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 shrink-0" size={17} /><span>{fileError}</span></div>}

          {rows.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-emerald-500/8 p-3"><p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{readyRows.length}</p><p className="text-xs text-muted-foreground">{copy("Ready rows", "Dòng sẵn sàng")}</p></div>
                <div className="rounded-xl border bg-amber-500/8 p-3"><p className="text-xl font-bold text-amber-700 dark:text-amber-300">{skipCount}</p><p className="text-xs text-muted-foreground">{copy("Duplicates skipped", "Dòng trùng bỏ qua")}</p></div>
                <div className="rounded-xl border bg-rose-500/8 p-3"><p className="text-xl font-bold text-rose-700 dark:text-rose-300">{errorCount}</p><p className="text-xs text-muted-foreground">{copy("Need attention", "Cần xử lý")}</p></div>
              </div>

              <div className="max-h-108 overflow-auto rounded-xl border">
                <table className="w-full min-w-2xl text-left text-xs">
                  <thead className="sticky top-0 bg-muted"><tr><th className="p-3">{copy("Row", "Dòng")}</th><th className="p-3">{copy("Record", "Bản ghi")}</th><th className="p-3">{copy("Status", "Trạng thái")}</th><th className="p-3">{copy("Details", "Chi tiết")}</th></tr></thead>
                  <tbody className="divide-y">
                    {analyzedRows.map((row) => {
                      const groupError = documentErrors.get(text(row.data.documentRef));
                      const state = groupError ? "error" : row.state;
                      return <tr key={row.rowNumber} className="align-top"><td className="p-3 font-mono text-muted-foreground">{row.rowNumber}</td><td className="p-3 font-semibold">{summary(row) || "—"}</td><td className="p-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${state === "ready" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : state === "skip" ? "bg-amber-500/12 text-amber-700 dark:text-amber-300" : state === "imported" ? "bg-primary/12 text-primary" : "bg-rose-500/12 text-rose-700 dark:text-rose-300"}`}>{state}</span></td><td className="p-3 text-muted-foreground">{[...row.errors, ...row.warnings, ...(groupError ? [groupError] : [])].join(" · ") || copy("Ready to import", "Sẵn sàng nhập")}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>

              {isImporting && <div className="rounded-xl border bg-muted/30 p-4"><div className="flex items-center justify-between text-sm font-semibold"><span className="flex items-center gap-2"><Loader2 className="animate-spin text-primary" size={16} />{copy("Importing and validating records…", "Đang nhập và kiểm tra dữ liệu…")}</span><span>{progress.current}/{progress.total}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }} /></div></div>}

              {runResult && <div className={`flex gap-3 rounded-xl border p-4 ${runResult.failed ? "border-amber-500/30 bg-amber-500/8" : "border-emerald-500/30 bg-emerald-500/8"}`}><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} /><div><p className="text-sm font-bold">{copy("Import finished", "Đã hoàn tất nhập dữ liệu")}</p><p className="mt-1 text-xs text-muted-foreground">{runResult.imported} {copy("imported", "đã nhập")} · {runResult.skipped} {copy("skipped", "bỏ qua")} · {runResult.failed} {copy("failed", "thất bại")}</p></div></div>}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">{errorCount > 0 ? copy("Fix the source file and upload it again for rows needing attention. Valid rows can still be imported.", "Sửa file nguồn và tải lại đối với các dòng cần xử lý. Bạn vẫn có thể nhập những dòng hợp lệ.") : copy("All displayed rows passed preflight validation.", "Tất cả dòng hiển thị đã qua kiểm tra trước khi nhập.")}</p>
                <Button type="button" onClick={executeImport} disabled={!readyRows.length || isImporting} className="shrink-0 gap-2">{isImporting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}{copy(`Import ${readyRows.length} ready rows`, `Nhập ${readyRows.length} dòng hợp lệ`)}</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
