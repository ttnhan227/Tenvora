import { useQuery } from "@tanstack/react-query";
import { History, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadingState } from "@/components/business/BusinessUI";
import { businessService } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

interface StockAdjustmentHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  productName?: string;
}

export function StockAdjustmentHistoryModal({
  open,
  onOpenChange,
  productId,
  productName,
}: StockAdjustmentHistoryModalProps) {
  const { isVietnamese } = useLanguage();

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ["stock-adjustments", productId],
    queryFn: () => businessService.getStockAdjustments(productId),
    enabled: open,
  });

  const reasonLabel = (reason: string) => {
    switch (reason) {
      case "Physical Count Correction":
        return isVietnamese ? "Kiểm kê định kỳ" : "Count correction";
      case "Damaged Goods":
        return isVietnamese ? "Hàng vỡ / hỏng" : "Damaged goods";
      case "Spoilage / Expired":
        return isVietnamese ? "Hết hạn / Hư hỏng" : "Spoiled / expired";
      case "Loss / Shrinkage":
        return isVietnamese ? "Hao hụt / Thất thoát" : "Shrinkage / loss";
      case "Internal Use":
        return isVietnamese ? "Dùng nội bộ" : "Internal use";
      case "Return to Supplier":
        return isVietnamese ? "Trả nhà cung cấp" : "Return to supplier";
      default:
        return reason;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <span>
              {isVietnamese
                ? productName
                  ? `Nhật ký điều chỉnh: ${productName}`
                  : "Nhật ký điều chỉnh tồn kho"
                : productName
                ? `Stock Adjustments: ${productName}`
                : "Stock Adjustment History"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isVietnamese
              ? "Toàn bộ lịch sử kiểm kê, hao hụt, hư hỏng và điều chỉnh số lượng tồn kho."
              : "Full audit trail of stock counts, spoilage, damages, and inventory adjustments."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingState label={isVietnamese ? "Đang tải nhật ký kho..." : "Loading adjustment records..."} />
        ) : adjustments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {isVietnamese ? "Chưa có lượt điều chỉnh kho nào." : "No stock adjustment records found."}
          </div>
        ) : (
          <div className="divide-y text-xs">
            {adjustments.map((adj) => (
              <div key={adj.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">
                      {adj.productName}
                    </span>
                    {adj.sku && (
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {adj.sku}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
                      {reasonLabel(adj.reason)}
                    </span>
                    <span>&bull;</span>
                    <span>{new Date(adj.adjustedAt).toLocaleString(isVietnamese ? "vi-VN" : "en-US")}</span>
                  </div>
                  {adj.notes && (
                    <p className="text-muted-foreground italic text-[11px] pt-0.5">
                      "{adj.notes}"
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1 font-bold text-sm">
                    {adj.adjustmentQuantity > 0 ? (
                      <span className="text-emerald-600 flex items-center">
                        <ArrowUpRight className="h-4 w-4" />
                        +{adj.adjustmentQuantity}
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center">
                        <ArrowDownRight className="h-4 w-4" />
                        {adj.adjustmentQuantity}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {adj.quantityBefore} &rarr; <strong>{adj.quantityAfter}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
