import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InvoiceSummary } from "@/services/invoiceService";
import { money } from "@/lib/money";

interface InvoiceDetailDialogProps {
  invoice: InvoiceSummary | null;
  onClose: () => void;
  renderStatusBadge: (status: string) => React.ReactNode;
}

export function InvoiceDetailDialog({
  invoice,
  onClose,
  renderStatusBadge,
}: InvoiceDetailDialogProps) {
  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-card border border-border">
        {invoice && (
          <div className="space-y-6 py-2">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold font-mono">{invoice.invoiceNumber}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Issued on {new Date(invoice.issueDate).toLocaleDateString()}
                </p>
              </div>
              <div>{renderStatusBadge(invoice.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-mono uppercase text-muted-foreground">Billed To</p>
                <p className="font-bold text-foreground mt-0.5">{invoice.clientName}</p>
                <p className="text-muted-foreground">{invoice.clientEmail}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-muted-foreground">Payment Due</p>
                <p className="font-bold text-foreground mt-0.5">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </p>
                <p className="text-muted-foreground">{invoice.paymentTerms || "Net 14"}</p>
              </div>
            </div>

            {/* Items */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 font-mono text-[10px] text-muted-foreground border-b border-border uppercase">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Hours/Qty</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 font-medium text-foreground">{it.description}</td>
                      <td className="py-2 px-3 text-right font-mono">{it.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {money(it.unitPrice, invoice.currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {money(it.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/40 font-mono text-xs">
              <span className="text-muted-foreground">Total Due:</span>
              <span className="text-lg font-bold text-foreground">
                {money(invoice.totalAmount, invoice.currency)}
              </span>
            </div>

            {invoice.notes && (
              <p className="text-xs text-muted-foreground italic">
                Note: {invoice.notes}
              </p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
