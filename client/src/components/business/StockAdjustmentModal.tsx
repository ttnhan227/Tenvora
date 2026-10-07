import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiError, businessService, Product } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess?: () => void;
}

export function StockAdjustmentModal({
  open,
  onOpenChange,
  product,
  onSuccess,
}: StockAdjustmentModalProps) {
  const { isVietnamese, t } = useLanguage();
  const queryClient = useQueryClient();

  const [adjustmentType, setAdjustmentType] = useState<"adjust" | "set">("adjust");
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [newTotalQty, setNewTotalQty] = useState<number>(product?.stockQuantity ?? 0);
  const [reason, setReason] = useState<string>("Physical Count Correction");
  const [notes, setNotes] = useState<string>("");

  const currentStock = product?.stockQuantity ?? 0;

  const calculatedAdjustment = adjustmentType === "adjust"
    ? adjustQty
    : newTotalQty - currentStock;

  const resultStock = currentStock + calculatedAdjustment;

  const mutation = useMutation({
    mutationFn: () =>
      businessService.createStockAdjustment({
        productId: product!.id,
        adjustmentQuantity: calculatedAdjustment,
        reason,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-paged"] });
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      toast.success(
        isVietnamese
          ? `Đã cập nhật tồn kho cho "${product?.name}"`
          : `Stock adjusted for "${product?.name}"`,
        {
          description: isVietnamese
            ? `Tồn kho mới: ${resultStock} ${product?.unit}`
            : `New stock level: ${resultStock} ${product?.unit}`,
        }
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(apiError(error, isVietnamese ? "Không thể điều chỉnh tồn kho." : "Could not adjust stock."));
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (calculatedAdjustment === 0) {
      toast.error(isVietnamese ? "Số lượng điều chỉnh phải khác 0." : "Adjustment quantity cannot be zero.");
      return;
    }
    if (resultStock < 0) {
      toast.error(isVietnamese ? "Tồn kho sau điều chỉnh không thể âm." : "Stock quantity cannot become negative.");
      return;
    }
    mutation.mutate();
  };

  const reasons = [
    { value: "Physical Count Correction", vi: "Kiểm kê định kỳ / Sửa số thực tế", en: "Physical count correction" },
    { value: "Damaged Goods", vi: "Hàng hoá bị hỏng / vỡ", en: "Damaged goods" },
    { value: "Spoilage / Expired", vi: "Hết hạn sử dụng / Hỏng hóc", en: "Spoiled or expired" },
    { value: "Loss / Shrinkage", vi: "Thất thoát / Hao hụt kho", en: "Loss or shrinkage" },
    { value: "Internal Use", vi: "Xuất dùng nội bộ cửa hàng", en: "Internal store use" },
    { value: "Return to Supplier", vi: "Xuất trả nhà cung cấp", en: "Return to supplier" },
    { value: "Other", vi: "Lý do khác", en: "Other reason" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <span>{isVietnamese ? "Điều chỉnh tồn kho" : "Adjust Stock"}</span>
          </DialogTitle>
          <DialogDescription>
            {isVietnamese
              ? `Ghi nhận kiểm kê hoặc hao hụt cho "${product?.name}". Mọi thay đổi đều được lưu vào nhật ký kho.`
              : `Record counts, spoilage, or loss for "${product?.name}". All changes are audited.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Current Stock Banner */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border">
            <span className="text-xs text-muted-foreground font-medium">
              {isVietnamese ? "Tồn kho sổ sách hiện tại" : "Current recorded stock"}
            </span>
            <span className="font-bold text-foreground text-sm">
              {currentStock} {product?.unit}
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-lg border bg-muted/30 p-1 text-xs">
            <button
              type="button"
              onClick={() => setAdjustmentType("adjust")}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                adjustmentType === "adjust"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isVietnamese ? "Tăng / Giảm (+ / -)" : "Add / Subtract (+ / -)"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustmentType("set");
                setNewTotalQty(currentStock);
              }}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                adjustmentType === "set"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isVietnamese ? "Nhập số đếm thực tế" : "Set actual count"}
            </button>
          </div>

          {adjustmentType === "adjust" ? (
            <div className="space-y-2">
              <Label htmlFor="adjust-qty">
                {isVietnamese ? "Số lượng thay đổi (+ để thêm, - để trừ)" : "Quantity change (+ to add, - to subtract)"} *
              </Label>
              <Input
                id="adjust-qty"
                type="number"
                step="any"
                required
                value={adjustQty === 0 ? "" : adjustQty}
                onChange={(e) => setAdjustQty(e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder={isVietnamese ? "Ví dụ: -2 hoặc 10" : "e.g. -2 or 10"}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="new-total-qty">
                {isVietnamese ? "Số lượng thực tế sau kiểm đếm" : "Actual physical count"} *
              </Label>
              <Input
                id="new-total-qty"
                type="number"
                min="0"
                step="any"
                required
                value={newTotalQty === 0 ? "" : newTotalQty}
                onChange={(e) => setNewTotalQty(e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder="0"
              />
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="adjust-reason">{isVietnamese ? "Lý do điều chỉnh" : "Adjustment reason"} *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="adjust-reason">
                <SelectValue placeholder={isVietnamese ? "Chọn lý do" : "Select reason"} />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {isVietnamese ? r.vi : r.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="adjust-notes">{isVietnamese ? "Ghi chú cụ thể" : "Notes / Explanation"}</Label>
            <Textarea
              id="adjust-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isVietnamese
                  ? "Ví dụ: Vỡ 2 hộp khi dọn kho sáng nay, kiểm kê cuối tháng..."
                  : "e.g. 2 boxes damaged during delivery..."
              }
              rows={2}
            />
          </div>

          {/* Live Preview Card */}
          <div className="rounded-xl border p-3 bg-muted/20 space-y-1 text-xs">
            <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              {isVietnamese ? "Xem trước kết quả tồn kho" : "Stock Level Preview"}
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="text-muted-foreground">{currentStock}</span>
              <span
                className={`font-semibold ${
                  calculatedAdjustment > 0
                    ? "text-emerald-600"
                    : calculatedAdjustment < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {calculatedAdjustment > 0 ? `+${calculatedAdjustment}` : calculatedAdjustment}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className={`font-bold ${
                  resultStock < 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {resultStock} {product?.unit}
              </span>
            </div>
            {resultStock < 0 && (
              <div className="flex items-center gap-1.5 text-destructive pt-1 font-semibold">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Tồn kho không thể âm!" : "Stock cannot be negative!"}</span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || calculatedAdjustment === 0 || resultStock < 0}
            >
              {mutation.isPending
                ? t("common.saving")
                : isVietnamese
                ? "Lưu điều chỉnh"
                : "Save Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
