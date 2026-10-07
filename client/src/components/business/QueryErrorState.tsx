import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiError } from "@/services/businessService";

export function QueryErrorState({ error, onRetry, retrying = false }: { error: unknown; onRetry: () => void; retrying?: boolean }) {
  const { isVietnamese } = useLanguage();
  return (
    <section role="alert" className="paper-card border-destructive/25 p-6">
      <h2 className="font-bold">{isVietnamese ? "Không thể tải dữ liệu" : "Could not load data"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{apiError(error, isVietnamese ? "Kiểm tra kết nối và thử lại." : "Check your connection and try again.")}</p>
      <Button className="mt-4" variant="outline" disabled={retrying} onClick={onRetry}>
        {retrying ? (isVietnamese ? "Đang thử lại…" : "Retrying…") : (isVietnamese ? "Thử lại" : "Try again")}
      </Button>
    </section>
  );
}
