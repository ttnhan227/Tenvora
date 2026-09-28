import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface PaginationBarProps {
  page?: number;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  totalItems?: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  itemName?: string;
}

export function PaginationBar({
  page,
  currentPage,
  totalPages,
  totalCount,
  totalItems,
  pageSize,
  onPageChange,
  itemName,
}: PaginationBarProps) {
  const { isVietnamese } = useLanguage();

  const activePage = page ?? currentPage ?? 1;
  const count = totalCount ?? totalItems ?? 0;
  const pages = totalPages ?? Math.max(1, Math.ceil(count / pageSize));

  if (pages <= 1 && count <= pageSize) {
    return (
      <div className="flex items-center justify-between text-xs text-muted-foreground px-2 py-3 border-t">
        <span>
          {isVietnamese ? `Tổng cộng ${count} ${itemName ?? "mục"}` : `Total ${count} ${itemName ?? "items"}`}
        </span>
      </div>
    );
  }

  const startIdx = count === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endIdx = Math.min(activePage * pageSize, count);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-muted-foreground px-2 py-3 border-t">
      <div>
        {isVietnamese ? (
          <span>
            Hiển thị <strong>{startIdx}</strong> - <strong>{endIdx}</strong> trên <strong>{totalCount}</strong> {itemName ?? "mục"}
          </span>
        ) : (
          <span>
            Showing <strong>{startIdx}</strong> - <strong>{endIdx}</strong> of <strong>{totalCount}</strong> {itemName ?? "items"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 gap-1 px-2.5 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>{isVietnamese ? "Trước" : "Prev"}</span>
        </Button>

        <span className="font-medium text-foreground px-2">
          {page} / {Math.max(1, totalPages)}
        </span>

        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 gap-1 px-2.5 text-xs"
        >
          <span>{isVietnamese ? "Sau" : "Next"}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
