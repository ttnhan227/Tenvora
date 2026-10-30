import React, { useState, useEffect, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  businessService,
  businessMoney,
  apiError,
} from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

export interface SupplierPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId?: string;
  supplierName?: string;
  initialAmount?: number;
  maxAmount?: number;
  currency?: string;
  onSuccess?: () => void;
}

export function SupplierPaymentModal({
  open,
  onOpenChange,
  supplierId: propSupplierId,
  supplierName: propSupplierName,
  initialAmount = 0,
  maxAmount,
  currency = "VND",
  onSuccess,
}: SupplierPaymentModalProps) {
  const { t, isVietnamese } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(propSupplierId ?? "");
  const [amount, setAmount] = useState<number>(initialAmount);
  const [method, setMethod] = useState<string>("Bank transfer");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const suppliersQuery = useQuery({
    queryKey: ["business-suppliers"],
    queryFn: () => businessService.getSuppliers(),
    enabled: open && !propSupplierId,
  });

  const suppliers = suppliersQuery.data ?? [];
  const activeSupplier = propSupplierId
    ? { id: propSupplierId, name: propSupplierName ?? t("Supplier"), outstandingBalance: maxAmount ?? 0, currency }
    : suppliers.find((s) => s.id === selectedSupplierId);

  useEffect(() => {
    if (open) {
      if (propSupplierId) {
        setSelectedSupplierId(propSupplierId);
      }
      setAmount(initialAmount || (maxAmount ?? 0));
      setMethod("Bank transfer");
      setReference("");
      setNotes("");
    }
  }, [open, propSupplierId, initialAmount, maxAmount]);

  const targetSupplierId = propSupplierId || selectedSupplierId;
  const effectiveMaxAmount = maxAmount ?? activeSupplier?.outstandingBalance ?? 999999999;

  const mutation = useMutation({
    mutationFn: () => {
      if (!targetSupplierId) throw new Error(t("Please select a supplier."));
      return businessService.recordSupplierAccountPayment(targetSupplierId, {
        amount,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-attention"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-insights"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["business-suppliers"] });
      if (targetSupplierId) {
        queryClient.invalidateQueries({ queryKey: ["business-supplier", targetSupplierId] });
      }

      toast.success(t("Supplier payment recorded"), {
        description: isVietnamese
          ? `Đã thanh toán ${businessMoney(result.totalAllocated, currency)} cho ${result.affectedPurchases.length} đơn nhập hàng. Số dư nợ còn lại: ${businessMoney(result.remainingBalance, currency)}.`
          : `Allocated ${businessMoney(result.totalAllocated, currency)} across ${result.affectedPurchases.length} purchases. Remaining balance: ${businessMoney(result.remainingBalance, currency)}.`,
      });

      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(apiError(err, t("Could not record supplier payment.")));
    },
  });

  const methodLabel = (m: string) => {
    switch (m) {
      case "Cash":
        return t("Cash");
      case "Bank transfer":
        return t("Bank transfer");
      case "Card":
        return t("Card");
      case "Other":
      default:
        return t("Other");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="notebook-label w-fit text-primary font-bold">
            {t("Supplier Quick-Pay")}
          </span>
          <DialogTitle className="mt-2">
            {isVietnamese
              ? `Thanh toán công nợ cho ${activeSupplier?.name || "nhà cung cấp"}`
              : `Pay supplier: ${activeSupplier?.name || "Supplier"}`}
          </DialogTitle>
          <DialogDescription>
            {t("The payment will automatically settle oldest unpaid purchases first (FIFO).")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          {!propSupplierId && (
            <div className="space-y-2">
              <Label htmlFor="supplier-select">{t("Select Supplier")} *</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger id="supplier-select">
                  <SelectValue placeholder={t("Choose a supplier…")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({t("Debt")}: {businessMoney(s.outstandingBalance, s.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeSupplier && activeSupplier.outstandingBalance > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t("Total outstanding balance")}
              </p>
              <strong className="mt-1 block text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">
                {businessMoney(activeSupplier.outstandingBalance, currency)}
              </strong>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t("Payment amount")} *</Label>
            <Input
              id="payment-amount"
              autoFocus
              required
              type="number"
              min="0.0001"
              max={effectiveMaxAmount > 0 ? effectiveMaxAmount : undefined}
              step="any"
              value={amount === 0 ? "" : amount}
              onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("Payment method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bank transfer">{methodLabel("Bank transfer")}</SelectItem>
                <SelectItem value="Cash">{methodLabel("Cash")}</SelectItem>
                <SelectItem value="Card">{methodLabel("Card")}</SelectItem>
                <SelectItem value="Other">{methodLabel("Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-ref">{t("Reference / Transaction ID")}</Label>
            <Input
              id="payment-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. VCB-987654"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">{t("Notes")}</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("Notes or payment agreement…")}
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !targetSupplierId || amount <= 0}
            >
              {mutation.isPending ? t("Allocating…") : t("Confirm payment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
