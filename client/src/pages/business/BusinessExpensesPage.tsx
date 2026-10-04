import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/business/BusinessUI";
import { SafeDeleteDialog } from "@/components/business/SafeDeleteDialog";
import { RecordImageField } from "@/components/business/RecordImageField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  apiError,
  businessMoney,
  businessService,
  BusinessExpense,
} from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessPermissions } from "@/hooks/useBusinessPermissions";
import { exportToCsv } from "@/lib/csvExport";

const categories = [
  "Transportation",
  "Utilities",
  "Supplies",
  "Rent",
  "Wages",
  "Marketing",
  "Maintenance",
  "Miscellaneous",
];

export default function BusinessExpensesPage() {
  const { isVietnamese, t } = useLanguage();
  const { canManageRecords } = useBusinessPermissions();
  const categoryLabel = (value: string) =>
    isVietnamese
      ? ({
          Transportation: "Đi lại",
          Utilities: "Điện nước",
          Supplies: "Vật tư",
          Rent: "Tiền thuê",
          Wages: "Tiền công",
          Marketing: "Quảng cáo",
          Maintenance: "Bảo trì",
          Miscellaneous: "Khác",
        }[value] ?? value)
      : value;

  const [params] = useSearchParams();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(params.get("create") === "1");
  const [editing, setEditing] = useState<BusinessExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<BusinessExpense | null>(null);

  const [form, setForm] = useState({
    category: "Transportation",
    amount: 0,
    expenseDate: new Date().toISOString().slice(0, 10),
    description: "",
    receiptImageDataUrl: undefined as string | undefined,
    removeReceiptImage: false,
  });

  const query = useQuery({
    queryKey: ["business-expenses", search, category],
    queryFn: () =>
      businessService.getBusinessExpenses(search, category === "all" ? "" : category),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? businessService.updateBusinessExpense(editing.id, form)
        : businessService.createBusinessExpense(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-expenses"] });
      qc.invalidateQueries({ queryKey: ["business-dashboard"] });
      setDeletingExpense(null);
      setOpen(false);
      setEditing(null);
      setForm({
        category: "Transportation",
        amount: 0,
        expenseDate: new Date().toISOString().slice(0, 10),
        description: "",
        receiptImageDataUrl: undefined,
        removeReceiptImage: false,
      });
      toast.success(
        editing
          ? isVietnamese
            ? "Đã cập nhật khoản chi"
            : "Expense updated"
          : isVietnamese
          ? "Đã ghi khoản chi"
          : "Expense recorded"
      );
    },
    onError: (e) =>
      toast.error(apiError(e, isVietnamese ? "Không thể lưu khoản chi." : "Could not save the expense.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => businessService.deleteBusinessExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-expenses"] });
      qc.invalidateQueries({ queryKey: ["business-dashboard"] });
      toast.success(isVietnamese ? "Đã xoá khoản chi" : "Expense deleted");
    },
    onError: (e) =>
      toast.error(apiError(e, isVietnamese ? "Không thể xoá khoản chi." : "Could not delete expense.")),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      category: "Transportation",
      amount: 0,
      expenseDate: new Date().toISOString().slice(0, 10),
      description: "",
      receiptImageDataUrl: undefined,
      removeReceiptImage: false,
    });
    setOpen(true);
  };

  const openEdit = (expense: BusinessExpense) => {
    setEditing(expense);
    setForm({
      category: expense.category,
      amount: expense.amount,
      expenseDate: expense.expenseDate.slice(0, 10),
      description: expense.description ?? "",
      receiptImageDataUrl: expense.receiptImageDataUrl,
      removeReceiptImage: false,
    });
    setOpen(true);
  };

  const handleExportCsv = () => {
    const expenses = query.data ?? [];
    if (expenses.length === 0) return;
    exportToCsv(
      `expenses-${new Date().toISOString().split("T")[0]}`,
      [
        { header: isVietnamese ? "Hạng mục" : "Category", accessor: (e) => e.category },
        { header: isVietnamese ? "Số tiền" : "Amount", accessor: (e) => e.amount },
        { header: isVietnamese ? "Tiền tệ" : "Currency", accessor: (e) => e.currency },
        { header: isVietnamese ? "Ngày chi" : "Expense Date", accessor: (e) => e.expenseDate.slice(0, 10) },
        { header: isVietnamese ? "Mô tả" : "Description", accessor: (e) => e.description ?? "" },
      ],
      expenses
    );
  };

  const totalExpenseSum = (query.data ?? []).reduce((acc, curr) => acc + curr.amount, 0);
  const currency = query.data?.[0]?.currency ?? "USD";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isVietnamese ? "Chi tiêu hằng ngày" : "Everyday spending"}
          title={t("nav.expenses")}
          description={
            isVietnamese
              ? "Ghi nhanh tiền đi lại, thuê mặt bằng, vật tư và các chi phí kinh doanh khác."
              : "Quickly note transport, rent, supplies, and other business costs—no accounting setup needed."
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {canManageRecords && <Button asChild variant="outline" className="gap-2"><Link to="/imports?type=expenses"><FileUp className="h-4 w-4" />{isVietnamese ? "Nhập chi phí" : "Import expenses"}</Link></Button>}
              {(query.data ?? []).length > 0 && (
                <Button variant="outline" onClick={handleExportCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isVietnamese ? "Xuất CSV" : "Export CSV"}
                </Button>
              )}
              {canManageRecords && <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                {isVietnamese ? "Thêm khoản chi" : "Add expense"}
              </Button>}
            </div>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-2xl flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isVietnamese ? "Tìm mô tả hoặc hạng mục" : "Search description or category"}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isVietnamese ? "Tất cả hạng mục" : "All categories"}</SelectItem>
                {categories.map((x) => (
                  <SelectItem key={x} value={x}>
                    {categoryLabel(x)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(query.data ?? []).length > 0 && (
            <div className="text-sm font-medium text-muted-foreground">
              {isVietnamese ? "Tổng chi:" : "Total:"}{" "}
              <span className="font-bold text-foreground">{businessMoney(totalExpenseSum, currency)}</span>
            </div>
          )}
        </div>

        {query.isLoading ? (
          <LoadingState label={isVietnamese ? "Đang mở sổ chi tiêu…" : "Opening your expense records…"} />
        ) : (query.data ?? []).length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={
              search || category !== "all"
                ? isVietnamese
                  ? "Không có khoản chi phù hợp"
                  : "No expenses match those filters"
                : isVietnamese
                ? "Chưa có khoản chi"
                : "No expenses yet"
            }
            description={
              search || category !== "all"
                ? isVietnamese
                  ? "Hãy xoá tìm kiếm hoặc chọn tất cả hạng mục."
                  : "Try clearing the search or choosing all categories."
                : isVietnamese
                ? "Các khoản đi lại, điện nước, vật tư và chi phí hằng ngày sẽ xuất hiện tại đây."
                : "Transportation, utilities, supplies, and other everyday costs will appear here."
            }
            action={!search && category === "all" && <Button onClick={openCreate}>{isVietnamese ? "Thêm khoản chi đầu tiên" : "Add first expense"}</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-[28px] border bg-card p-2 shadow-sm">
            <div className="divide-y">
              {query.data!.map((e) => (
                <div key={e.id} className="grid gap-3 rounded-2xl p-4 transition-colors hover:bg-muted/25 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    {new Date(e.expenseDate).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                    <span className="mt-1 block text-[10px] font-medium tracking-normal opacity-70">{new Date(e.expenseDate).getFullYear()}</span>
                  </div>
                  <div className="min-w-0 border-l-2 border-rose-500/25 pl-4">
                    <div className="flex items-center gap-3">
                      {e.receiptImageDataUrl && (
                        <a href={e.receiptImageDataUrl} target="_blank" rel="noreferrer" className="friendly-focus block h-11 w-11 shrink-0 overflow-hidden rounded-lg border" aria-label={isVietnamese ? "Mở ảnh biên lai" : "Open receipt image"}>
                          <img src={e.receiptImageDataUrl} alt="" className="h-full w-full object-cover" />
                        </a>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">{categoryLabel(e.category)}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {e.description || (isVietnamese ? "Không có mô tả" : "No description")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="tabular-nums font-bold text-base text-foreground">
                      {businessMoney(e.amount, e.currency)}
                    </p>
                    <div className="flex items-center gap-1">
                      {canManageRecords && <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(e)}
                        aria-label={isVietnamese ? "Sửa" : "Edit"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>}
                      {canManageRecords && <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingExpense(e)}
                        className="text-destructive hover:text-destructive"
                        aria-label={isVietnamese ? "Xoá" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? isVietnamese
                  ? "Sửa khoản chi"
                  : "Edit expense"
                : isVietnamese
                ? "Thêm khoản chi"
                : "Add expense"}
            </DialogTitle>
            <DialogDescription>
              {isVietnamese
                ? "Ghi chi phí kinh doanh cùng hạng mục, số tiền và ngày chi."
                : "Record a business cost with its category, amount, and date."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>{isVietnamese ? "Hạng mục" : "Category"} *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((x) => (
                    <SelectItem key={x} value={x}>
                      {categoryLabel(x)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <RecordImageField
              label={isVietnamese ? "Ảnh biên lai / hoá đơn" : "Receipt or invoice image"}
              helpText={isVietnamese ? "Chụp hoặc chọn ảnh chứng từ. Ảnh lớn sẽ tự động được thu nhỏ." : "Take or choose a document photo. Large images are resized automatically."}
              value={form.receiptImageDataUrl}
              onChange={(value, removed) => setForm({ ...form, receiptImageDataUrl: value, removeReceiptImage: removed })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">{isVietnamese ? "Số tiền" : "Amount"} *</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  required
                  min="0.0001"
                  step="any"
                  value={form.amount === 0 ? "" : form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value === "" ? 0 : Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-date">{isVietnamese ? "Ngày" : "Date"} *</Label>
                <Input
                  id="expense-date"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.expenseDate}
                  onChange={(e) =>
                    setForm({ ...form, expenseDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-description">{isVietnamese ? "Mô tả chi tiết" : "Description"}</Label>
              <Textarea
                id="expense-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={isVietnamese ? "Nội dung chi tiêu, người nhận tiền…" : "Expense purpose, payee…"}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? isVietnamese
                    ? "Đang lưu…"
                    : "Saving…"
                  : editing
                  ? isVietnamese
                    ? "Lưu thay đổi"
                    : "Save changes"
                  : isVietnamese
                  ? "Ghi khoản chi"
                  : "Record expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <SafeDeleteDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
        recordType={isVietnamese ? "khoản chi" : "expense"}
        recordName={deletingExpense ? `${businessMoney(deletingExpense.amount, deletingExpense.currency)} · ${categoryLabel(deletingExpense.category)}` : ""}
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingExpense && deleteMutation.mutate(deletingExpense.id)}
      />
    </DashboardLayout>
  );
}
