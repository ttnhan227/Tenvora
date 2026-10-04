import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface SafeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordType: string;
  recordName: string;
  historyAware?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
}

export function SafeDeleteDialog({
  open,
  onOpenChange,
  recordType,
  recordName,
  historyAware = false,
  isPending = false,
  onConfirm,
}: SafeDeleteDialogProps) {
  const { isVietnamese, t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {isVietnamese ? `Xoá ${recordType}?` : `Delete ${recordType}?`}
          </DialogTitle>
          <DialogDescription>
            {isVietnamese
              ? "Kiểm tra ảnh hưởng đến lịch sử trước khi xác nhận thao tác này."
              : "Review the effect on record history before confirming this action."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            {isVietnamese
              ? `Bạn có chắc muốn xoá “${recordName}”?`
              : `Are you sure you want to delete “${recordName}”?`}
          </p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-foreground">
            {historyAware
              ? isVietnamese
                ? "Bản ghi chưa từng được sử dụng sẽ bị xoá vĩnh viễn. Nếu đã liên kết với giao dịch, hệ thống sẽ chuyển sang Đã lưu trữ để bảo toàn lịch sử tài chính."
                : "Unused records are deleted permanently. If this record is linked to transactions, it will be archived instead so your financial history remains accurate."
              : isVietnamese
              ? "Bản ghi này sẽ bị xoá vĩnh viễn khỏi báo cáo. Thao tác này không thể hoàn tác."
              : "This record will be permanently removed from reports. This action cannot be undone."}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending
              ? isVietnamese
                ? "Đang xoá…"
                : "Deleting…"
              : isVietnamese
              ? `Xoá ${recordType}`
              : `Delete ${recordType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
