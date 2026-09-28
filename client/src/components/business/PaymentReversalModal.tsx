import { FormEvent, useState } from "react";
import { Undo2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiError, businessMoney } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

interface PaymentReversalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  paymentAmount: number;
  paymentCurrency: string;
  paymentMethod: string;
  referenceDocNumber?: string;
  onConfirm: (reason: string) => Promise<unknown>;
  title?: string;
}

export function PaymentReversalModal({
  open,
  onOpenChange,
  paymentAmount,
  paymentCurrency,
  paymentMethod,
  referenceDocNumber,
  onConfirm,
  title,
}: PaymentReversalModalProps) {
  const { isVietnamese, t } = useLanguage();
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await onConfirm(reason);
      toast.success(
        isVietnamese
          ? `Đã hoàn tác khoản thanh toán ${businessMoney(paymentAmount, paymentCurrency)}`
          : `Reversed payment of ${businessMoney(paymentAmount, paymentCurrency)}`
      );
      onOpenChange(false);
      setReason("");
    } catch (err) {
      toast.error(apiError(err, isVietnamese ? "Không thể hoàn tác thanh toán." : "Could not reverse payment."));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Undo2 className="h-5 w-5" />
            <span>{title ?? (isVietnamese ? "Hoàn tác thanh toán" : "Reverse Payment")}</span>
          </DialogTitle>
          <DialogDescription>
            {isVietnamese
              ? "Khoản thanh toán sẽ được đánh dấu hoàn tác trong sổ sách và số dư công nợ sẽ được tính toán lại tương ứng."
              : "This payment will be marked as reversed and the outstanding balance will be recalculated accordingly."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Payment Summary Box */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isVietnamese ? "Số tiền hoàn tác" : "Amount to reverse"}:</span>
              <strong className="text-base text-destructive font-serif tabular-nums">
                {businessMoney(paymentAmount, paymentCurrency)}
              </strong>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>{isVietnamese ? "Phương thức" : "Method"}:</span>
              <span>{paymentMethod}</span>
            </div>
            {referenceDocNumber && (
              <div className="flex justify-between items-center text-muted-foreground">
                <span>{isVietnamese ? "Số chứng từ" : "Document"}:</span>
                <span className="font-mono">{referenceDocNumber}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reversal-reason">{isVietnamese ? "Lý do hoàn tác" : "Reversal Reason"} *</Label>
            <Textarea
              id="reversal-reason"
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Ví dụ: Nhập nhầm số tiền, khách yêu cầu hoàn tiền..."
                  : "e.g. Incorrect amount entered, customer requested refund..."
              }
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {isVietnamese
                ? "Thao tác này mang tính ghi nhận kế toán minh bạch (append-only) và không thể xóa bỏ khỏi lịch sử kiểm toán."
                : "This creates an append-only accounting record and cannot be expunged from the audit history."}
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending || !reason.trim()}>
              {isPending
                ? t("common.saving")
                : isVietnamese
                ? "Xác nhận hoàn tác"
                : "Confirm Reversal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
