import { describe, expect, it } from "vitest";
import { parseStatementCsv, suggestInvoice, type StatementRow } from "@/components/income/StatementImportDialog";
import type { InvoiceSummary } from "@/services/invoiceService";

const invoice = {
  id: "inv-1",
  invoiceNumber: "INV-001",
  clientId: "client-1",
  clientName: "Acme Studio",
  clientEmail: "billing@acme.test",
  issueDate: "2026-09-01T00:00:00Z",
  dueDate: "2026-09-15T00:00:00Z",
  currency: "USD",
  subtotal: 2000,
  taxRate: 0,
  taxAmount: 0,
  totalAmount: 2000,
  amountPaid: 0,
  status: "Sent",
  paymentTerms: "Net 14",
  createdAt: "2026-09-01T00:00:00Z",
  items: [],
} as InvoiceSummary;

describe("statement import", () => {
  it("parses positive deposits and ignores outgoing or invalid rows", () => {
    const result = parseStatementCsv([
      "Date,Description,Amount,Currency",
      '2026-09-08,"Acme Studio, INV-001","$2,000.00",usd',
      "2026-09-09,Software subscription,-49.00,USD",
      "missing-date,Bad row,not-a-number,USD",
    ].join("\n"));

    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      date: "2026-09-08",
      description: "Acme Studio, INV-001",
      amount: 2000,
      currency: "USD",
    });
    expect(result.skippedRows).toBe(2);
  });

  it("requires the columns used by the matching workflow", () => {
    expect(parseStatementCsv("When,Note,Value\n2026-09-08,Acme,2000").error)
      .toMatch(/Date, Description, and Amount/i);
  });

  it("suggests an open invoice by amount and reference", () => {
    const row: StatementRow = {
      id: "row-1",
      date: "2026-09-08",
      description: "Payment from Acme Studio for INV-001",
      amount: 2000,
      currency: "USD",
    };

    expect(suggestInvoice(row, [invoice])?.id).toBe("inv-1");
  });

  it("does not automatically apply a deposit larger than the invoice balance", () => {
    const row: StatementRow = {
      id: "row-2",
      date: "2026-09-10",
      description: "Payment from Acme Studio for INV-001",
      amount: 3500,
      currency: "USD",
    };

    expect(suggestInvoice(row, [invoice])).toBeUndefined();
  });
});
