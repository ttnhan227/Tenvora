export type ImportKind = "customers" | "suppliers" | "products" | "sales" | "purchases" | "expenses";

export type ImportCell = string | number | boolean | Date | null | undefined;
export type ImportData = Record<string, ImportCell>;

export interface ParsedImportRow {
  rowNumber: number;
  data: ImportData;
}

export interface ImportField {
  key: string;
  label: string;
  aliases: string[];
  required?: boolean;
}

export interface ImportDefinition {
  kind: ImportKind;
  label: string;
  description: string;
  fields: ImportField[];
  sample: Record<string, string | number>[];
}

const contactFields: ImportField[] = [
  { key: "name", label: "Name", aliases: ["name", "customer name", "supplier name", "ten", "ten khach hang", "ten nha cung cap"], required: true },
  { key: "phone", label: "Phone", aliases: ["phone", "phone number", "mobile", "dien thoai", "so dien thoai", "sdt"] },
  { key: "email", label: "Email", aliases: ["email", "email address"] },
  { key: "address", label: "Address", aliases: ["address", "dia chi"] },
  { key: "notes", label: "Notes", aliases: ["notes", "note", "ghi chu"] },
];

export const importDefinitions: Record<ImportKind, ImportDefinition> = {
  customers: {
    kind: "customers",
    label: "Customers",
    description: "Customer directory with contact details.",
    fields: contactFields,
    sample: [
      { Name: "Cong Huynh", Phone: "0901234567", Email: "cong@example.com", Address: "Da Nang", Notes: "Wholesale customer" },
    ],
  },
  suppliers: {
    kind: "suppliers",
    label: "Suppliers",
    description: "Supplier directory with contact details.",
    fields: contactFields,
    sample: [
      { Name: "Highland Coffee Farm", Phone: "0907654321", Email: "farm@example.com", Address: "Dak Lak", Notes: "Coffee supplier" },
    ],
  },
  products: {
    kind: "products",
    label: "Products & inventory",
    description: "Catalog, prices, opening stock, and low-stock levels.",
    fields: [
      { key: "name", label: "Product Name", aliases: ["product name", "name", "product", "item", "item name", "ten hang", "ten san pham", "hang hoa"], required: true },
      { key: "sku", label: "SKU", aliases: ["sku", "code", "product code", "item code", "ma hang", "ma san pham", "ma sp"] },
      { key: "unit", label: "Unit", aliases: ["unit", "uom", "don vi", "don vi tinh", "dvt"], required: true },
      { key: "defaultPrice", label: "Selling Price", aliases: ["selling price", "sale price", "retail price", "price", "gia ban", "don gia"], required: true },
      { key: "costPrice", label: "Cost Price", aliases: ["cost price", "cost", "purchase price", "gia von", "gia nhap"] },
      { key: "stockQuantity", label: "Opening Stock", aliases: ["opening stock", "stock quantity", "stock", "quantity", "qty", "ton kho", "so luong", "ton"] },
      { key: "minStockLevel", label: "Minimum Stock", aliases: ["minimum stock", "min stock", "reorder level", "low stock", "ton toi thieu", "dinh muc toi thieu"] },
      { key: "notes", label: "Notes", aliases: ["notes", "note", "ghi chu"] },
    ],
    sample: [
      { "Product Name": "Robusta coffee 1kg", SKU: "ROB-1KG", Unit: "bag", "Selling Price": 12, "Cost Price": 8, "Opening Stock": 40, "Minimum Stock": 5, Notes: "" },
    ],
  },
  expenses: {
    kind: "expenses",
    label: "Expenses",
    description: "Historical or current operating expenses.",
    fields: [
      { key: "category", label: "Category", aliases: ["category", "expense category", "type", "loai chi", "danh muc"], required: true },
      { key: "amount", label: "Amount", aliases: ["amount", "total", "value", "so tien", "tong tien"], required: true },
      { key: "date", label: "Date", aliases: ["date", "expense date", "transaction date", "ngay", "ngay chi"] },
      { key: "description", label: "Description", aliases: ["description", "details", "memo", "notes", "noi dung", "ghi chu"] },
    ],
    sample: [
      { Category: "Rent", Amount: 350, Date: "2026-09-01", Description: "September shop rent" },
    ],
  },
  sales: {
    kind: "sales",
    label: "Sales invoices",
    description: "One row per invoice line; rows sharing a document reference become one sale.",
    fields: [
      { key: "documentRef", label: "Document Reference", aliases: ["document reference", "invoice number", "invoice no", "sale number", "reference", "ref", "so hoa don", "ma don"], required: true },
      { key: "date", label: "Date", aliases: ["date", "sale date", "invoice date", "sold at", "ngay", "ngay ban"] },
      { key: "customer", label: "Customer", aliases: ["customer", "customer name", "buyer", "khach hang", "ten khach hang"], required: true },
      { key: "product", label: "Product", aliases: ["product", "product name", "item", "item name", "hang hoa", "san pham", "ten hang"] },
      { key: "sku", label: "SKU", aliases: ["sku", "product code", "item code", "ma hang", "ma san pham"] },
      { key: "quantity", label: "Quantity", aliases: ["quantity", "qty", "so luong"], required: true },
      { key: "unitPrice", label: "Unit Price", aliases: ["unit price", "price", "selling price", "don gia", "gia ban"] },
      { key: "paidAmount", label: "Paid Amount", aliases: ["paid amount", "amount paid", "payment", "da tra", "thanh toan"] },
      { key: "paymentMethod", label: "Payment Method", aliases: ["payment method", "method", "payment type", "phuong thuc", "hinh thuc thanh toan"] },
      { key: "notes", label: "Notes", aliases: ["notes", "note", "memo", "ghi chu"] },
    ],
    sample: [
      { "Document Reference": "INV-001", Date: "2026-09-28", Customer: "Cong Huynh", Product: "Robusta coffee 1kg", SKU: "ROB-1KG", Quantity: 2, "Unit Price": 12, "Paid Amount": 10, "Payment Method": "Cash", Notes: "Balance due" },
      { "Document Reference": "INV-001", Date: "2026-09-28", Customer: "Cong Huynh", Product: "Cappuccino", SKU: "CAP-01", Quantity: 1, "Unit Price": 3, "Paid Amount": "", "Payment Method": "", Notes: "" },
    ],
  },
  purchases: {
    kind: "purchases",
    label: "Purchase bills",
    description: "One row per bill line; linked products automatically increase inventory.",
    fields: [
      { key: "documentRef", label: "Document Reference", aliases: ["document reference", "bill number", "bill no", "purchase number", "reference", "ref", "so hoa don", "ma don"], required: true },
      { key: "date", label: "Date", aliases: ["date", "purchase date", "bill date", "purchased at", "ngay", "ngay mua"] },
      { key: "supplier", label: "Supplier", aliases: ["supplier", "supplier name", "vendor", "nha cung cap", "ten nha cung cap"], required: true },
      { key: "product", label: "Product", aliases: ["product", "product name", "item", "item name", "hang hoa", "san pham", "ten hang"] },
      { key: "sku", label: "SKU", aliases: ["sku", "product code", "item code", "ma hang", "ma san pham"] },
      { key: "description", label: "Description", aliases: ["description", "details", "line description", "noi dung", "dien giai"] },
      { key: "unit", label: "Unit", aliases: ["unit", "uom", "don vi", "dvt"] },
      { key: "quantity", label: "Quantity", aliases: ["quantity", "qty", "so luong"], required: true },
      { key: "unitCost", label: "Unit Cost", aliases: ["unit cost", "cost", "purchase price", "don gia", "gia nhap"], required: true },
      { key: "paidAmount", label: "Paid Amount", aliases: ["paid amount", "amount paid", "payment", "da tra", "thanh toan"] },
      { key: "paymentMethod", label: "Payment Method", aliases: ["payment method", "method", "payment type", "phuong thuc", "hinh thuc thanh toan"] },
      { key: "notes", label: "Notes", aliases: ["notes", "note", "memo", "ghi chu"] },
    ],
    sample: [
      { "Document Reference": "BILL-001", Date: "2026-09-27", Supplier: "Highland Coffee Farm", Product: "Robusta coffee 1kg", SKU: "ROB-1KG", Description: "Robusta restock", Unit: "bag", Quantity: 20, "Unit Cost": 8, "Paid Amount": 100, "Payment Method": "Bank transfer", Notes: "Remaining payable" },
    ],
  },
};

export function normalizeImportText(value: ImportCell): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCsv(text: string): ImportCell[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiterCounts = [",", ";", "\t"].map((candidate) => {
    let count = 0;
    let quoted = false;
    for (let index = 0; index < firstLine.length; index++) {
      if (firstLine[index] === '"') {
        if (quoted && firstLine[index + 1] === '"') index++;
        else quoted = !quoted;
      } else if (!quoted && firstLine[index] === candidate) count++;
    }
    return { candidate, count };
  });
  const delimiter = delimiterCounts.sort((a, b) => b.count - a.count)[0]?.candidate ?? ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export async function readImportFile(file: File, definition: ImportDefinition): Promise<ParsedImportRow[]> {
  let matrix: ImportCell[][];
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const { default: readXlsxFile } = await import("read-excel-file");
    matrix = (await readXlsxFile(file)) as ImportCell[][];
  } else {
    matrix = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
  }

  if (matrix.length < 2) throw new Error("The file must contain a header row and at least one data row.");
  if (matrix.length > 5001) throw new Error("A single import is limited to 5,000 rows.");

  const headerMap = new Map<string, number>();
  matrix[0].forEach((header, index) => headerMap.set(normalizeImportText(header), index));
  const fieldIndexes = new Map<string, number>();
  for (const field of definition.fields) {
    const aliases = [field.label, ...field.aliases].map(normalizeImportText);
    const exact = aliases.find((alias) => headerMap.has(alias));
    if (exact) {
      fieldIndexes.set(field.key, headerMap.get(exact)!);
      continue;
    }
    const compatibleHeader = [...headerMap.keys()].find((header) =>
      aliases.some((alias) => header.startsWith(`${alias} `)) || aliases.some((alias) => alias.startsWith(`${header} `)),
    );
    if (compatibleHeader) fieldIndexes.set(field.key, headerMap.get(compatibleHeader)!);
  }

  const missingHeaders = definition.fields.filter((field) => field.required && !fieldIndexes.has(field.key));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required column${missingHeaders.length > 1 ? "s" : ""}: ${missingHeaders.map((field) => field.label).join(", ")}.`);
  }

  return matrix.slice(1).map((values, index) => {
    const data: ImportData = {};
    for (const [key, column] of fieldIndexes) data[key] = values[column];
    return { rowNumber: index + 2, data };
  }).filter((row) => Object.values(row.data).some((value) => String(value ?? "").trim().length > 0));
}

export function importNumber(value: ImportCell): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value ?? "").trim().replace(/[^0-9,.-]/g, "");
  if (!raw) return null;
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  let normalized = raw;
  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (comma >= 0) {
    const decimals = raw.length - comma - 1;
    normalized = decimals > 0 && decimals <= 2 ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (dot >= 0) {
    const decimals = raw.length - dot - 1;
    normalized = decimals > 0 && decimals <= 2 ? raw.replace(/,/g, "") : raw.replace(/\./g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function importDate(value: ImportCell): string | undefined {
  const calendarDate = (year: number, month: number, day: number) => {
    const candidate = new Date(year, month - 1, day);
    if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return undefined;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return calendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const parts = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!parts) return undefined;
  return calendarDate(Number(parts[3]), Number(parts[2]), Number(parts[1]));
}

export function importString(value: ImportCell): string {
  return String(value ?? "").trim();
}

function csvCell(value: string | number): string {
  const raw = String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function downloadImportTemplate(definition: ImportDefinition): void {
  const headers = definition.fields.map((field) => field.label);
  const lines = [headers, ...definition.sample.map((sample) => headers.map((header) => sample[header] ?? ""))]
    .map((row) => row.map(csvCell).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tenvora-${definition.kind}-import-template.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
