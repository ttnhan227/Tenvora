import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { invoiceService, type InvoiceSummary } from "@/services/invoiceService";
import {
  parseStatementCsv,
  suggestInvoice,
  remainingAmount,
  referencedOpenInvoice,
  type StatementRow,
  type StatementParseResult,
} from "@/lib/statementParser";

export type { StatementRow, StatementParseResult };

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

interface StatementImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: InvoiceSummary[];
  defaultCurrency?: string;
  onPaymentRecorded: () => void | Promise<void>;
}

export function StatementImportDialog({
  open,
  onOpenChange,
  invoices,
  defaultCurrency = "USD",
  onPaymentRecorded,
}: StatementImportDialogProps) {
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, string>>({});
  const [recordedRows, setRecordedRows] = useState<Set<string>>(new Set());
  const [processingRow, setProcessingRow] = useState("");
  const [error, setError] = useState("");
  const [skippedRows, setSkippedRows] = useState(0);

  const invoiceById = useMemo(
    () => new Map(invoices.map((invoice) => [invoice.id, invoice])),
    [invoices],
  );

  const suggestedInvoices = useMemo(() => {
    const suggestions: Record<string, string> = {};
    rows.forEach((row) => {
      const suggestion = suggestInvoice(row, invoices);
      if (suggestion) suggestions[row.id] = suggestion.id;
    });
    return suggestions;
  }, [rows, invoices]);

  useEffect(() => {
    setSelectedInvoices((current) => {
      let changed = false;
      const next = { ...current };

      Object.entries(suggestedInvoices).forEach(([rowId, invoiceId]) => {
        if (!next[rowId]) {
          next[rowId] = invoiceId;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [suggestedInvoices]);

  const reset = () => {
    setRows([]);
    setSelectedInvoices({});
    setRecordedRows(new Set());
    setProcessingRow("");
    setError("");
    setSkippedRows(0);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError("");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a CSV statement exported from your bank or payment platform.");
      return;
    }

    const parsed = parseStatementCsv(await file.text(), defaultCurrency);
    setRows(parsed.rows);
    setSkippedRows(parsed.skippedRows);
    setError(parsed.error || "");

    // Suggestions are derived reactively so a statement uploaded before the
    // invoice list finishes loading still receives its automatic matches.
    setSelectedInvoices({});
    setRecordedRows(new Set());
  };

  const recordPayment = async (row: StatementRow) => {
    const invoice = invoiceById.get(selectedInvoices[row.id]);
    if (!invoice) {
      setError("Choose the invoice this deposit belongs to before recording it.");
      return;
    }

    const remaining = remainingAmount(invoice);
    if (row.amount > remaining + 0.01) {
      setError(`This deposit is larger than the ${formatMoney(remaining, invoice.currency)} remaining on ${invoice.invoiceNumber}.`);
      return;
    }

    setError("");
    setProcessingRow(row.id);
    try {
      await invoiceService.payInvoice(invoice.id, { amount: row.amount, autoTaxSetAside: true, reference: row.description }, `statement-${invoice.id}-${row.id}`);
      setRecordedRows((current) => new Set(current).add(row.id));
      await onPaymentRecorded();
      toast.success(`${invoice.invoiceNumber} updated from the imported deposit.`);
    } catch (requestError) {
      console.error("Could not record imported payment", requestError);
      setError("The payment could not be recorded. Your statement file and balances were not changed.");
    } finally {
      setProcessingRow("");
    }
  };

  const availableInvoices = invoices.filter((invoice) =>
    ["Sent", "Viewed", "Overdue"].includes(invoice.status) && remainingAmount(invoice) > 0,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" /> Import income statement
          </DialogTitle>
          <DialogDescription>
            Upload a CSV export, review suggested invoice matches, then confirm only the deposits you recognize.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center">
            <input
              id="statement-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <label htmlFor="statement-file" className="cursor-pointer space-y-2 block">
              <FileUp className="mx-auto h-7 w-7 text-primary" />
              <span className="block text-sm font-semibold text-foreground">Choose a CSV statement</span>
              <span className="block text-xs text-muted-foreground">
                Required columns: Date, Description, Amount. Currency is optional.
              </span>
            </label>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>The CSV is read in your browser and is not uploaded or stored. Only a payment you explicitly confirm is recorded.</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Positive deposits found</h3>
                  <p className="text-xs text-muted-foreground">
                    {rows.length} income row{rows.length === 1 ? "" : "s"} ready for review
                    {skippedRows > 0 ? ` · ${skippedRows} non-income or invalid row${skippedRows === 1 ? "" : "s"} skipped` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {Object.keys(suggestedInvoices).length} rule-based suggestion{Object.keys(suggestedInvoices).length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="space-y-2">
                {rows.map((row) => {
                  const recorded = recordedRows.has(row.id);
                  const selectedInvoice = invoiceById.get(selectedInvoices[row.id]);
                  const suggestedInvoice = invoiceById.get(suggestedInvoices[row.id]);
                  const referencedInvoice = referencedOpenInvoice(row, invoices);
                  const referenceAmountMismatch = referencedInvoice && row.amount > remainingAmount(referencedInvoice) + 0.01;
                  return (
                    <div key={row.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatMoney(row.amount, row.currency)}
                            </p>
                            <span className="text-[11px] text-muted-foreground">{row.date}</span>
                          </div>
                          <p className="mt-1 truncate text-xs font-medium text-foreground" title={row.description}>{row.description}</p>
                        </div>

                        {recorded ? (
                          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" /> Payment recorded
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <p className={`text-[11px] font-medium ${
                              suggestedInvoice
                                ? "text-primary"
                                : referenceAmountMismatch
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-muted-foreground"
                            }`}>
                              {suggestedInvoice
                                ? `Rule-based suggestion: ${suggestedInvoice.invoiceNumber} · ${suggestedInvoice.clientName}`
                                : referenceAmountMismatch
                                  ? `Reference found: ${referencedInvoice.invoiceNumber} has ${formatMoney(remainingAmount(referencedInvoice), referencedInvoice.currency)} due, but this deposit is ${formatMoney(row.amount, row.currency)}`
                                : "No automatic suggestion · choose manually only if you recognize the deposit"}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <label className="sr-only" htmlFor={`invoice-${row.id}`}>Invoice match</label>
                            <select
                              id={`invoice-${row.id}`}
                              aria-label={`Invoice match for ${row.description}`}
                              value={selectedInvoices[row.id] || ""}
                              onChange={(event) => setSelectedInvoices((current) => ({ ...current, [row.id]: event.target.value }))}
                              className="h-9 min-w-56 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="">Choose an invoice</option>
                              {availableInvoices
                                .filter((invoice) => invoice.currency.toUpperCase() === row.currency)
                                .map((invoice) => (
                                  <option key={invoice.id} value={invoice.id}>
                                    {invoice.invoiceNumber} · {invoice.clientName} · {formatMoney(remainingAmount(invoice), invoice.currency)} due
                                  </option>
                                ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!selectedInvoice || processingRow === row.id}
                              onClick={() => void recordPayment(row)}
                            >
                              {processingRow === row.id ? "Recording…" : "Record match"}
                            </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
