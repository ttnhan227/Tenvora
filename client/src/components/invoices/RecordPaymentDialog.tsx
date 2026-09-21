import React, { useState, useEffect } from "react";
import { CheckCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invoiceService, type InvoiceSummary } from "@/services/invoiceService";
import { money } from "@/lib/money";
import type { CelebrationData } from "./InvoiceCelebrationModal";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceSummary | null;
  taxRule: { enabled: boolean; rate: number };
  onPaymentSuccess: (data: CelebrationData) => void;
  onRefresh: () => Promise<void>;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  taxRule,
  onPaymentSuccess,
  onRefresh,
}: RecordPaymentDialogProps) {
  const [payAmount, setPayAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentKey, setPaymentKey] = useState(crypto.randomUUID());
  const [autoTaxSetAside, setAutoTaxSetAside] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (invoice && open) {
      setPayAmount(Math.max(0, invoice.totalAmount - invoice.amountPaid));
      setPaymentReference("");
      setPaymentKey(crypto.randomUUID());
      setAutoTaxSetAside(taxRule.enabled);
    }
  }, [invoice, open, taxRule.enabled]);

  const handleRecordPayment = async () => {
    if (!invoice) return;
    const remainingAmount = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    if (payAmount <= 0 || payAmount > remainingAmount) {
      toast.error("Enter a payment amount greater than zero and no more than the outstanding balance.");
      return;
    }

    try {
      setPaying(true);
      await invoiceService.payInvoice(
        invoice.id,
        {
          amount: payAmount,
          autoTaxSetAside,
          reference: paymentReference || undefined,
        },
        paymentKey
      );

      const celebration: CelebrationData = {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        amount: payAmount,
        currency: invoice.currency,
        autoTaxSetAside,
        taxRate: taxRule.rate,
      };

      onOpenChange(false);
      onPaymentSuccess(celebration);
      toast.success(
        `Payment recorded: ${money(payAmount, invoice.currency)} from ${invoice.clientName}. Your cash-flow estimate is updated.`
      );
      await onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Record Client Payment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record a confirmed payment without changing or deleting earlier payment history.
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <Label htmlFor="payment-amount" className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Payment amount ({invoice.currency})
              </Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                max={invoice.totalAmount - invoice.amountPaid}
                step="0.01"
                value={payAmount}
                onChange={(event) => setPayAmount(Number(event.target.value))}
                className="bg-card text-lg font-bold tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                Outstanding: {money(invoice.totalAmount - invoice.amountPaid, invoice.currency)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-reference" className="text-xs font-semibold">Reference (optional)</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Bank reference or note"
              />
            </div>

            {/* Tax Set-Aside Ring-Fence Box */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <Label htmlFor="apply-tax-reserve" className="cursor-pointer text-xs font-bold">
                    Apply saved tax-reserve rule
                  </Label>
                </div>
                <input
                  id="apply-tax-reserve"
                  type="checkbox"
                  checked={autoTaxSetAside}
                  onChange={(e) => setAutoTaxSetAside(e.target.checked)}
                  disabled={!taxRule.enabled}
                  className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  aria-label="Apply saved tax-reserve rule"
                />
              </div>

              {!taxRule.enabled ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 border-t border-border pt-2.5">
                  The saved reserve rule is off. Enable it in Tax settings before recording a payment if you want an automatic allocation.
                </p>
              ) : autoTaxSetAside ? (
                <p className="text-[11px] text-muted-foreground border-t border-border pt-2.5">
                  Tenvora will apply the saved {taxRule.rate}% planning rate and record the allocation in the workspace ledger.
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Tax allocation disabled. The full payment will remain in the recorded operating balance.
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={paying}
                onClick={handleRecordPayment}
                className="text-xs font-semibold"
              >
                {paying ? "Processing..." : "Confirm & Record Payment"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
