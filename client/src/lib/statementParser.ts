import { type InvoiceSummary } from "@/services/invoiceService";

export interface StatementRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
}

export interface StatementParseResult {
  rows: StatementRow[];
  skippedRows: number;
  error?: string;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findHeader(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function parseAmount(value: string): number {
  const negative = /^\s*\(/.test(value) || /^\s*-/.test(value);
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return Number.NaN;
  return negative ? -numeric : numeric;
}

export function parseStatementCsv(csv: string, defaultCurrency = "USD"): StatementParseResult {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { rows: [], skippedRows: 0, error: "The CSV needs a header and at least one transaction row." };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const dateIndex = findHeader(headers, ["date", "transactiondate", "posteddate", "valuedate"]);
  const descriptionIndex = findHeader(headers, ["description", "details", "memo", "reference", "narration"]);
  const amountIndex = findHeader(headers, ["amount", "transactionamount"]);
  const creditIndex = findHeader(headers, ["credit", "creditamount", "deposit", "moneyin"]);
  const currencyIndex = findHeader(headers, ["currency", "ccy"]);

  if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && creditIndex < 0)) {
    return {
      rows: [],
      skippedRows: 0,
      error: "Use columns for Date, Description, and Amount (or Credit). Currency is optional.",
    };
  }

  const rows: StatementRow[] = [];
  let skippedRows = 0;

  lines.slice(1).forEach((line, index) => {
    const columns = parseCsvLine(line);
    const rawAmount = columns[amountIndex >= 0 ? amountIndex : creditIndex] || "";
    const amount = parseAmount(rawAmount);
    const description = columns[descriptionIndex]?.trim();
    const date = columns[dateIndex]?.trim();

    if (!date || !description || !Number.isFinite(amount) || amount <= 0) {
      skippedRows += 1;
      return;
    }

    rows.push({
      id: `statement-${index}-${date}-${amount}`,
      date,
      description,
      amount,
      currency: (columns[currencyIndex]?.trim() || defaultCurrency).toUpperCase(),
    });
  });

  return rows.length > 0
    ? { rows, skippedRows }
    : { rows: [], skippedRows, error: "No positive income transactions were found in this file." };
}

export function remainingAmount(invoice: InvoiceSummary): number {
  return Math.max(0, invoice.totalAmount - invoice.amountPaid);
}

export function referencedOpenInvoice(row: StatementRow, invoices: InvoiceSummary[]): InvoiceSummary | undefined {
  const description = row.description.toLowerCase();
  return invoices.find((invoice) =>
    ["Sent", "Viewed", "PartiallyPaid", "Overdue"].includes(invoice.status) &&
    invoice.currency.toUpperCase() === row.currency &&
    description.includes(invoice.invoiceNumber.toLowerCase()),
  );
}

export function suggestInvoice(row: StatementRow, invoices: InvoiceSummary[]): InvoiceSummary | undefined {
  const description = row.description.toLowerCase();

  return invoices
    .filter((invoice) =>
      ["Sent", "Viewed", "PartiallyPaid", "Overdue"].includes(invoice.status) &&
      invoice.currency.toUpperCase() === row.currency &&
      row.amount <= remainingAmount(invoice) + 0.01,
    )
    .map((invoice) => {
      let score = 0;
      if (Math.abs(remainingAmount(invoice) - row.amount) < 0.01) score += 3;
      if (description.includes(invoice.invoiceNumber.toLowerCase())) score += 5;
      if (description.includes(invoice.clientName.toLowerCase())) score += 2;
      return { invoice, score };
    })
    .filter((candidate) => candidate.score >= 3)
    .sort((a, b) => b.score - a.score)[0]?.invoice;
}
