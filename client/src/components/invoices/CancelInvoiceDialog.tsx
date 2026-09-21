import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InvoiceSummary } from "@/services/invoiceService";

interface CancelInvoiceDialogProps {
  target: InvoiceSummary | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  pending: boolean;
}

export function CancelInvoiceDialog({
  target,
  onClose,
  onConfirm,
  pending,
}: CancelInvoiceDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target?.status === "Draft" ? "Delete this draft?" : "Cancel this invoice?"}
          </DialogTitle>
          <DialogDescription>
            {target?.status === "Draft"
              ? "This removes the unpaid draft. No financial transaction will be changed."
              : "The invoice will remain in your records as cancelled and will no longer count as outstanding."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep invoice
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending
              ? "Updating…"
              : target?.status === "Draft"
              ? "Delete draft"
              : "Cancel invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
