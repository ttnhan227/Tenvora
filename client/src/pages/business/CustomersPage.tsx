import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, FileUp, Filter, Pencil, Plus, Search, Trash2, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { QueryErrorState } from "@/components/business/QueryErrorState";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/business/BusinessUI";
import { PaginationBar } from "@/components/business/PaginationBar";
import { SafeDeleteDialog } from "@/components/business/SafeDeleteDialog";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessPermissions } from "@/hooks/useBusinessPermissions";
import { exportToCsv } from "@/lib/csvExport";
import {
  apiError,
  businessMoney,
  businessService,
  BusinessCustomer,
  CustomerInput,
} from "@/services/businessService";

const emptyCustomer: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  status: "Active",
};

export default function CustomersPage() {
  const { isVietnamese, t } = useLanguage();
  const { canManageRecords } = useBusinessPermissions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [statusFilter, setStatusFilter] = useState<"Active" | "Archived" | "all">("Active");
  const [debtFilter, setDebtFilter] = useState<"all" | "has_debt" | "zero_balance">("all");
  const [dialogOpen, setDialogOpen] = useState(params.get("create") === "1");
  const [editing, setEditing] = useState<BusinessCustomer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<BusinessCustomer | null>(null);
  const [form, setForm] = useState<CustomerInput>(emptyCustomer);

  const { data: pagedData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["business-customers-paged", search, statusFilter, debtFilter, page],
    queryFn: async () => {
      const status = statusFilter === "all" ? "" : statusFilter;
      if (debtFilter === "all") return businessService.getCustomersPaged(search, status, page, pageSize);
      // Filter before pagination so a match beyond the first page remains discoverable.
      const customers = await businessService.getCustomers(search, status);
      const matches = customers.filter(customer => debtFilter === "has_debt" ? customer.outstandingBalance > 0 : customer.outstandingBalance <= 0);
      return { items: matches.slice((page - 1) * pageSize, page * pageSize), totalCount: matches.length, page, pageSize, totalPages: Math.ceil(matches.length / pageSize) };
    },
  });

  const rawCustomers = pagedData?.items ?? [];
  const totalCount = pagedData?.totalCount ?? 0;

  const filteredCustomers = rawCustomers;

  const totalOutstanding = rawCustomers.reduce((acc, curr) => acc + curr.outstandingBalance, 0);
  const currency = rawCustomers[0]?.currency ?? "USD";

  const save = useMutation({
    mutationFn: () =>
      editing ? businessService.updateCustomer(editing.id, form) : businessService.createCustomer(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      queryClient.invalidateQueries({ queryKey: ["business-customers-paged"] });
      setDialogOpen(false);
      toast.success(
        editing
          ? isVietnamese
            ? "Đã cập nhật khách hàng"
            : "Customer updated"
          : isVietnamese
          ? "Đã thêm khách hàng"
          : "Customer added"
      );
      if (!editing && returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
        navigate(returnTo);
      }
    },
    onError: (error) =>
      toast.error(apiError(error, isVietnamese ? "Không thể lưu khách hàng." : "Could not save the customer.")),
  });

  const remove = useMutation({
    mutationFn: (customer: BusinessCustomer) => businessService.deleteCustomer(customer.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["business-customers"] });
      queryClient.invalidateQueries({ queryKey: ["business-customers-paged"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      setDeletingCustomer(null);
      toast.success(result.deletedPermanently
        ? isVietnamese ? "Đã xoá khách hàng" : "Customer deleted"
        : isVietnamese ? "Đã lưu trữ khách hàng để bảo toàn lịch sử giao dịch" : "Customer archived to preserve transaction history");
    },
    onError: (error) => toast.error(apiError(error, isVietnamese ? "Không thể xoá khách hàng." : "Could not delete the customer.")),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCustomer);
    setDialogOpen(true);
  };

  const openEdit = (customer: BusinessCustomer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
      status: customer.status,
    });
    setDialogOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const handleExportCsv = () => {
    if (filteredCustomers.length === 0) return;
    exportToCsv(
      `customers-${new Date().toISOString().split("T")[0]}`,
      [
        { header: isVietnamese ? "Tên khách hàng" : "Customer Name", accessor: (c) => c.name },
        { header: isVietnamese ? "Số điện thoại" : "Phone", accessor: (c) => c.phone ?? "" },
        { header: "Email", accessor: (c) => c.email ?? "" },
        { header: isVietnamese ? "Địa chỉ" : "Address", accessor: (c) => c.address ?? "" },
        { header: isVietnamese ? "Tổng tiền mua" : "Total Sales", accessor: (c) => c.totalSales },
        { header: isVietnamese ? "Đã thanh toán" : "Total Paid", accessor: (c) => c.totalPaid },
        { header: isVietnamese ? "Còn nợ" : "Outstanding Balance", accessor: (c) => c.outstandingBalance },
        { header: isVietnamese ? "Số đơn" : "Sales Count", accessor: (c) => c.salesCount },
        { header: isVietnamese ? "Ghi chú" : "Notes", accessor: (c) => c.notes ?? "" },
      ],
      filteredCustomers
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isVietnamese ? "Người mua hàng của bạn" : "People you sell to"}
          title={t("nav.customers")}
          description={
            isVietnamese
              ? "Lưu thông tin liên hệ, đơn bán, khoản thanh toán và công nợ của từng khách hàng."
              : "Keep names, contact details, sales, payments, and current balances together."
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {canManageRecords && <Button asChild variant="outline" className="gap-2"><Link to="/imports?type=customers"><FileUp className="h-4 w-4" />{isVietnamese ? "Nhập danh sách" : "Import list"}</Link></Button>}
              {rawCustomers.length > 0 && (
                <Button variant="outline" onClick={handleExportCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isVietnamese ? "Xuất CSV" : "Export CSV"}
                </Button>
              )}
              {canManageRecords && <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                {isVietnamese ? "Thêm khách hàng" : "Add customer"}
              </Button>}
            </div>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-3xl flex-1 flex-wrap gap-3 sm:items-center">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={isVietnamese ? "Tìm theo tên, điện thoại hoặc email" : "Search by name, phone, or email"}
                className="pl-9"
              />
            </div>

            <div className="flex rounded-lg border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("Active");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === "Active"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isVietnamese ? "Đang giao dịch" : "Active"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("Archived");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === "Archived"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isVietnamese ? "Đã lưu trữ" : "Archived"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isVietnamese ? "Tất cả" : "All"}
              </button>
            </div>

            <Select value={debtFilter} onValueChange={(val: "all" | "has_debt" | "zero_balance") => { setDebtFilter(val); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isVietnamese ? "Tất cả công nợ" : "All debt status"}</SelectItem>
                <SelectItem value="has_debt">
                  {isVietnamese ? "Đang có nợ phải thu" : "Customers with debt"}
                </SelectItem>
                <SelectItem value="zero_balance">
                  {isVietnamese ? "Đã thanh toán đủ" : "Settled / No debt"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {totalOutstanding > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{isVietnamese ? "Công nợ trên trang này:" : "Receivables on this page:"}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {businessMoney(totalOutstanding, currency)}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <LoadingState label={isVietnamese ? "Đang mở danh sách khách hàng…" : "Opening your customer list…"} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => { void refetch(); }} retrying={isFetching} />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              search || debtFilter !== "all"
                ? isVietnamese
                  ? "Không tìm thấy khách hàng phù hợp"
                  : "No customers match that search"
                : isVietnamese
                ? "Chưa có khách hàng"
                : "No customers yet"
            }
            description={
              search || debtFilter !== "all"
                ? isVietnamese
                  ? "Hãy thử tên, số điện thoại hoặc xoá bộ lọc nợ."
                  : "Try a name, phone number, or clearing the debt filter."
                : isVietnamese
                ? "Thêm người hoặc doanh nghiệp đầu tiên bạn bán hàng. Số dư sẽ tự cập nhật sau mỗi đơn bán và khoản thanh toán."
                : "Add the first person or business you sell to. Their balance will update automatically with every sale and payment."
            }
            action={
              !search && debtFilter === "all" && (
                canManageRecords && <Button onClick={openCreate}>{isVietnamese ? "Thêm khách hàng đầu tiên" : "Add first customer"}</Button>
              )
            }
          />
        ) : (
          <div className="paper-card overflow-hidden">
            <div className="divide-y">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className={`grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center hover:bg-muted/20 transition-colors ${customer.status === "Archived" ? "opacity-60" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/customers/${customer.id}`} className="font-semibold text-foreground hover:text-primary">{customer.name}</Link>
                      {customer.status === "Archived" && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">{isVietnamese ? "Đã lưu trữ" : "Archived"}</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {[customer.phone, customer.email].filter(Boolean).join(" · ") ||
                        (isVietnamese ? "Chưa có thông tin liên hệ" : "No contact details")}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p
                      className={
                        customer.outstandingBalance > 0
                          ? "font-bold text-amber-600 dark:text-amber-400"
                          : "font-semibold text-foreground"
                      }
                    >
                      {businessMoney(customer.outstandingBalance, customer.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {customer.outstandingBalance > 0
                        ? isVietnamese
                          ? `còn nợ · ${customer.salesCount} đơn bán`
                          : `outstanding · ${customer.salesCount} sales`
                        : isVietnamese
                        ? `hết nợ · ${customer.salesCount} đơn bán`
                        : `settled · ${customer.salesCount} sales`}
                    </p>
                  </div>
                  <div className="flex gap-1 sm:justify-end">
                    {canManageRecords && <Button variant="ghost" size="icon" aria-label={`${isVietnamese ? "Sửa" : "Edit"} ${customer.name}`} onClick={() => openEdit(customer)}><Pencil size={16} /></Button>}
                    {canManageRecords && <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`${isVietnamese ? "Xoá" : "Delete"} ${customer.name}`} onClick={() => setDeletingCustomer(customer)}><Trash2 size={16} /></Button>}
                    <Button variant="ghost" size="icon" asChild>
                      <Link
                        aria-label={`${isVietnamese ? "Xem" : "View"} ${customer.name}`}
                        to={`/customers/${customer.id}`}
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <span className="notebook-label w-fit">{isVietnamese ? "Thông tin khách hàng" : "Customer card"}</span>
            <DialogTitle className="mt-2">
              {editing
                ? isVietnamese
                  ? "Sửa khách hàng"
                  : "Edit customer"
                : isVietnamese
                ? "Thêm khách hàng"
                : "Add customer"}
            </DialogTitle>
            <DialogDescription>
              {isVietnamese
                ? "Lưu thông tin giúp bạn nhận biết và liên hệ khách hàng này."
                : "Save the details you use to recognize and contact this customer."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">{isVietnamese ? "Tên khách hàng" : "Name"} *</Label>
              <Input
                id="customer-name"
                autoFocus
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={isVietnamese ? "Tên khách hàng hoặc tên công ty" : "Customer or company name"}
              />
            </div>

            {editing && (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm hover:bg-muted/40">
                <input type="checkbox" checked={form.status === "Active"} onChange={(e) => setForm({ ...form, status: e.target.checked ? "Active" : "Archived" })} />
                {isVietnamese ? "Đang giao dịch (có sẵn cho đơn bán mới)" : "Active and available for new sales"}
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-phone">{isVietnamese ? "Điện thoại" : "Phone"}</Label>
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0901234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">{isVietnamese ? "Địa chỉ" : "Address"}</Label>
              <Input
                id="customer-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={isVietnamese ? "Số nhà, tên đường, phường/xã…" : "Street address, ward, city…"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-notes">{isVietnamese ? "Ghi chú" : "Notes"}</Label>
              <Textarea
                id="customer-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={isVietnamese ? "Thông tin hữu ích cần nhớ, hạn mức nợ…" : "Payment terms, special notes…"}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button disabled={save.isPending}>
                {save.isPending
                  ? t("common.saving")
                  : isVietnamese
                  ? "Lưu khách hàng"
                  : "Save customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <SafeDeleteDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        recordType={isVietnamese ? "khách hàng" : "customer"}
        recordName={deletingCustomer?.name ?? ""}
        historyAware
        isPending={remove.isPending}
        onConfirm={() => deletingCustomer && remove.mutate(deletingCustomer)}
      />
    </DashboardLayout>
  );
}
