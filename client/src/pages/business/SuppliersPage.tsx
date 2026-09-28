import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Pencil, Plus, Search, Truck } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csvExport";
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
import { useLanguage } from "@/contexts/LanguageContext";
import {
  apiError,
  businessMoney,
  businessService,
  Supplier,
} from "@/services/businessService";

const empty = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  status: "Active",
};

export default function SuppliersPage() {
  const { isVietnamese, t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(params.get("create") === "1");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const suppliers = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => businessService.getSuppliers(search),
  });
  const save = useMutation({
    mutationFn: () =>
      editing
        ? businessService.updateSupplier(editing.id, form)
        : businessService.createSupplier(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      setOpen(false);
      toast.success(editing ? (isVietnamese ? "Đã cập nhật nhà cung cấp" : "Supplier updated") : (isVietnamese ? "Đã thêm nhà cung cấp" : "Supplier added"));
      if (!editing && returnTo?.startsWith("/") && !returnTo.startsWith("//")) navigate(returnTo);
    },
    onError: (e) => toast.error(apiError(e, isVietnamese ? "Không thể lưu nhà cung cấp." : "Could not save the supplier.")),
  });
  const edit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      notes: s.notes ?? "",
      status: s.status,
    });
    setOpen(true);
  };
  const create = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const handleExportCsv = () => {
    const list = suppliers.data ?? [];
    if (list.length === 0) return;
    exportToCsv(
      `suppliers-${new Date().toISOString().split("T")[0]}`,
      [
        { header: isVietnamese ? "Tên nhà cung cấp" : "Supplier Name", accessor: (s) => s.name },
        { header: isVietnamese ? "Số điện thoại" : "Phone", accessor: (s) => s.phone ?? "" },
        { header: "Email", accessor: (s) => s.email ?? "" },
        { header: isVietnamese ? "Địa chỉ" : "Address", accessor: (s) => s.address ?? "" },
        { header: isVietnamese ? "Tổng tiền mua" : "Total Purchases", accessor: (s) => s.totalPurchases },
        { header: isVietnamese ? "Đã thanh toán" : "Total Paid", accessor: (s) => s.totalPaid },
        { header: isVietnamese ? "Còn nợ" : "Outstanding Balance", accessor: (s) => s.outstandingBalance },
      ],
      list
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isVietnamese ? "Người bạn nhập hàng" : "People you buy from"}
          title={t("nav.suppliers")}
          description={
            isVietnamese
              ? "Quản lý thông tin liên hệ, lần nhập hàng, thanh toán và số tiền còn nợ."
              : "Keep contact details, purchases, payments, and what you still owe in one place."
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="gap-2"><Link to="/imports?type=suppliers"><FileUp className="h-4 w-4" />{isVietnamese ? "Nhập danh sách" : "Import list"}</Link></Button>
              {(suppliers.data ?? []).length > 0 && (
                <Button variant="outline" onClick={handleExportCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isVietnamese ? "Xuất CSV" : "Export CSV"}
                </Button>
              )}
              <Button onClick={create} className="gap-2">
                <Plus className="h-4 w-4" />
                {isVietnamese ? "Thêm nhà cung cấp" : "Add supplier"}
              </Button>
            </div>
          }
        />
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isVietnamese ? "Tìm tên, điện thoại hoặc email" : "Search name, phone, or email"}
          />
        </div>
        {suppliers.isLoading ? (
          <LoadingState label={isVietnamese ? "Đang mở danh sách nhà cung cấp…" : "Opening your supplier list…"} />
        ) : (suppliers.data ?? []).length === 0 ? (
          <EmptyState icon={Truck} title={search ? (isVietnamese ? "Không tìm thấy nhà cung cấp phù hợp" : "No suppliers match that search") : (isVietnamese ? "Chưa có nhà cung cấp" : "No suppliers yet")} description={search ? (isVietnamese ? "Hãy thử tên, số điện thoại hoặc email khác." : "Try a name, phone number, or email address.") : (isVietnamese ? "Thêm người hoặc doanh nghiệp bạn nhập hàng. Số dư sẽ tự cập nhật theo các lần nhập hàng và thanh toán." : "Add the people and businesses you buy from. Their balance will update automatically when you record purchases and payments.")} action={!search && <Button onClick={create}>{isVietnamese ? "Thêm nhà cung cấp đầu tiên" : "Add first supplier"}</Button>} />
        ) : (
          <div className="paper-card overflow-hidden">
            <div className="divide-y">
              {suppliers.data!.map((s) => (
                <div
                  key={s.id}
                  className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[s.phone, s.email].filter(Boolean).join(" · ") ||
                        (isVietnamese ? "Chưa có thông tin liên hệ" : "No contact details")}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p
                      className={
                        s.outstandingBalance > 0
                          ? "font-semibold text-amber-600"
                          : "font-semibold"
                      }
                    >
                      {businessMoney(s.outstandingBalance, s.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isVietnamese ? `còn nợ · ${s.purchaseCount} lần nhập` : `owed · ${s.purchaseCount} purchases`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${isVietnamese ? "Sửa" : "Edit"} ${s.name}`}
                    onClick={() => edit(s)}
                  >
                    <Pencil size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? (isVietnamese ? "Sửa nhà cung cấp" : "Edit supplier") : (isVietnamese ? "Thêm nhà cung cấp" : "Add supplier")}
            </DialogTitle>
            <DialogDescription>{isVietnamese ? "Lưu thông tin liên hệ và số dư nhập hàng của nhà cung cấp." : "Keep supplier contact details and purchase balances together."}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="supplier-name">{isVietnamese ? "Tên" : "Name"} *</Label>
              <Input
                id="supplier-name"
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-phone">{isVietnamese ? "Điện thoại" : "Phone"}</Label>
                <Input
                  id="supplier-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">{isVietnamese ? "Địa chỉ" : "Address"}</Label>
              <Input
                id="supplier-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-notes">{isVietnamese ? "Ghi chú" : "Notes"}</Label>
              <Textarea
                id="supplier-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
              <Button disabled={save.isPending}>
                {save.isPending ? t("common.saving") : (isVietnamese ? "Lưu nhà cung cấp" : "Save supplier")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
