import { FormEvent, useState } from "react";
import { AlertCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiError } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoidDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "sale" | "purchase";
  documentNumber: string;
  totalAmountFormatted: string;
  hasPayments: boolean;
  onConfirm: (options: { reversePayments: boolean; reason?: string }) => Promise<unknown>;
}

export function VoidDocumentModal({
  open,
  onOpenChange,
  documentType,
  documentNumber,
  totalAmountFormatted,
  hasPayments,
  onConfirm,
}: VoidDocumentModalProps) {
  const { isVietnamese, t } = useLanguage();
  const [reversePayments, setReversePayments] = useState(true);
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  const isSale = documentType === "sale";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await onConfirm({ reversePayments, reason: reason || undefined });
      toast.success(
        isVietnamese
          ? `Đã hủy chứng từ ${documentNumber}`
          : `Voided ${documentNumber}`
      );
      onOpenChange(false);
      setReason("");
    } catch (err) {
      toast.error(apiError(err, isVietnamese ? "Không thể hủy chứng từ." : "Could not void document."));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            <span>
              {isVietnamese
                ? isSale
                  ? `Hủy đơn bán hàng ${documentNumber}`
                  : `Hủy đơn nhập hàng ${documentNumber}`
                : isSale
                ? `Void Sale ${documentNumber}`
                : `Void Purchase ${documentNumber}`}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isVietnamese
              ? "Chứng từ sẽ được chuyển sang trạng thái Đã hủy (Voided) và không thể hoàn tác."
              : "This document will be marked as Voided and cannot be un-voided."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Summary Box */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isVietnamese ? "Số chứng từ" : "Document"}:</span>
              <strong className="font-mono text-sm">{documentNumber}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isVietnamese ? "Tổng tiền" : "Total Amount"}:</span>
              <strong className="text-sm font-serif tabular-nums text-foreground">{totalAmountFormatted}</strong>
            </div>
          </div>

          {/* Inventory impact notice */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground border">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              {isVietnamese
                ? isSale
                  ? "Tồn kho: Hàng hoá trong đơn này sẽ được tự động hoàn trả lại vào kho."
                  : "Tồn kho: Hàng hoá đã nhập sẽ được trừ khỏi kho. Nếu hàng đã bán và kho không đủ, hệ thống sẽ từ chối để tránh tồn kho âm."
                : isSale
                ? "Inventory: Items sold in this order will be automatically returned to stock."
                : "Inventory: Received items will be deducted. If items were already sold, the void will be rejected to prevent negative stock."}
            </span>
          </div>

          {/* Reverse payments checkbox */}
          {hasPayments && (
            <label className="flex items-start gap-2.5 rounded-xl border p-3 text-xs cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                checked={reversePayments}
                onChange={(e) => setReversePayments(e.target.checked)}
                className="mt-0.5 rounded border-gray-300"
              />
              <div className="space-y-0.5">
                <span className="font-medium text-foreground">
                  {isVietnamese ? "Hoàn tác các khoản thanh toán liên quan" : "Reverse all associated payments"}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Đánh dấu hoàn tác toàn bộ tiền đã thu/chi cho đơn này để số dư tài khoản chính xác."
                    : "Mark all payments received/paid for this order as reversed."}
                </p>
              </div>
            </label>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="void-reason">{isVietnamese ? "Lý do hủy đơn" : "Void Reason"}</Label>
            <Textarea
              id="void-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Ví dụ: Khách đổi ý, lập trùng đơn hàng..."
                  : "e.g. Customer cancelled order, duplicate entry..."
              }
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending
                ? t("common.saving")
                : isVietnamese
                ? "Xác nhận hủy đơn"
                : "Confirm Void"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
