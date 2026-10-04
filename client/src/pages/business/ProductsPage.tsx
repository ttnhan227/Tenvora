import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, History, Package, Pencil, Plus, Search, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/business/BusinessUI";
import { PaginationBar } from "@/components/business/PaginationBar";
import { SafeDeleteDialog } from "@/components/business/SafeDeleteDialog";
import { RecordImageField } from "@/components/business/RecordImageField";
import { StockAdjustmentModal } from "@/components/business/StockAdjustmentModal";
import { StockAdjustmentHistoryModal } from "@/components/business/StockAdjustmentHistoryModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessPermissions } from "@/hooks/useBusinessPermissions";
import { exportToCsv } from "@/lib/csvExport";
import { apiError, businessMoney, businessService, Product, ProductInput } from "@/services/businessService";

const emptyProduct: ProductInput = {
  name: "",
  sku: "",
  unit: "item",
  defaultPrice: 0,
  costPrice: 0,
  stockQuantity: 0,
  minStockLevel: 0,
  trackInventory: true,
  notes: "",
  imageDataUrl: undefined,
  removeImage: false,
  isActive: true,
};

export default function ProductsPage() {
  const { isVietnamese, t } = useLanguage();
  const { canManageRecords } = useBusinessPermissions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(params.get("create") === "1");
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyProduct);

  // Stock Adjustment modals
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [historyModalProduct, setHistoryModalProduct] = useState<Product | null>(null);
  const [globalHistoryOpen, setGlobalHistoryOpen] = useState(false);

  const activeParam = statusFilter === "all" ? undefined : statusFilter === "active";

  const { data: pagedResult, isLoading } = useQuery({
    queryKey: ["products-paged", search, statusFilter, page],
    queryFn: () => businessService.getProductsPaged(search, activeParam, page, 20),
  });

  const products = pagedResult?.items ?? [];
  const totalCount = pagedResult?.totalCount ?? 0;
  const totalPages = pagedResult?.totalPages ?? 1;

  const save = useMutation({
    mutationFn: () =>
      editing ? businessService.updateProduct(editing.id, form) : businessService.createProduct(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-paged"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      toast.success(
        editing
          ? isVietnamese
            ? "Đã cập nhật hàng hoá"
            : "Product updated"
          : isVietnamese
          ? "Đã thêm hàng hoá"
          : "Product added"
      );
      if (!editing && returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
        navigate(returnTo);
      }
    },
    onError: (error) =>
      toast.error(apiError(error, isVietnamese ? "Không thể lưu hàng hoá." : "Could not save the product.")),
  });

  const remove = useMutation({
    mutationFn: (product: Product) => businessService.deleteProduct(product.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products-paged"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeletingProduct(null);
      toast.success(
        result.deletedPermanently
          ? isVietnamese
            ? "Đã xoá hàng hoá"
            : "Product deleted"
          : isVietnamese
          ? "Đã lưu trữ hàng hoá để bảo toàn lịch sử giao dịch"
          : "Product archived to preserve transaction history"
      );
    },
    onError: (error) =>
      toast.error(apiError(error, isVietnamese ? "Không thể xoá hàng hoá." : "Could not delete the product.")),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProduct);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      unit: product.unit,
      defaultPrice: product.defaultPrice,
      costPrice: product.costPrice ?? 0,
      stockQuantity: product.stockQuantity ?? 0,
      minStockLevel: product.minStockLevel ?? 0,
      trackInventory: product.trackInventory ?? true,
      notes: product.notes ?? "",
      imageDataUrl: product.imageDataUrl,
      removeImage: false,
      isActive: product.isActive,
    });
    setDialogOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const handleExportCsv = () => {
    if (products.length === 0) return;
    exportToCsv<Product>(
      `products-${new Date().toISOString().split("T")[0]}`,
      [
        { header: isVietnamese ? "Tên hàng hoá" : "Product Name", accessor: (p) => p.name },
        { header: isVietnamese ? "Mã SKU" : "SKU", accessor: (p) => p.sku ?? "" },
        { header: isVietnamese ? "Đơn vị" : "Unit", accessor: (p) => p.unit },
        { header: isVietnamese ? "Giá bán" : "Selling Price", accessor: (p) => p.defaultPrice },
        { header: isVietnamese ? "Giá vốn" : "Cost Price", accessor: (p) => p.costPrice ?? 0 },
        { header: isVietnamese ? "Tồn kho" : "Stock Quantity", accessor: (p) => p.stockQuantity ?? 0 },
        { header: isVietnamese ? "Định mức tối thiểu" : "Min Stock Alert", accessor: (p) => p.minStockLevel ?? "" },
        { header: isVietnamese ? "Trạng thái" : "Status", accessor: (p) => (p.isActive ? "Active" : "Inactive") },
        { header: isVietnamese ? "Ghi chú" : "Notes", accessor: (p) => p.notes ?? "" },
      ],
      products
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          actionsFullWidth
          eyebrow={isVietnamese ? "Hàng hoá bạn bán" : "What you sell"}
          title={isVietnamese ? "Hàng hoá & Tồn kho" : "Products & Inventory"}
          description={
            isVietnamese
              ? "Quản lý danh mục hàng hoá, giá vốn, giá bán và theo dõi mức tồn kho tự động."
              : "Manage product catalog, cost price, selling price, and track automated stock inventory."
          }
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
              <Button
                variant="outline"
                onClick={() => setGlobalHistoryOpen(true)}
                className="h-10 shrink-0 gap-2"
              >
                <History className="h-4 w-4" />
                {isVietnamese ? "Nhật ký điều chỉnh kho" : "Stock Adjustments"}
              </Button>
              {canManageRecords && (
                <Button asChild variant="outline" className="h-10 shrink-0 gap-2">
                  <Link to="/imports?type=products">
                    <Upload className="h-4 w-4" />
                    {isVietnamese ? "Nhập Excel / CSV" : "Import Excel / CSV"}
                  </Link>
                </Button>
              )}
              {products.length > 0 && (
                <Button variant="outline" onClick={handleExportCsv} className="h-10 shrink-0 gap-2">
                  <Download className="h-4 w-4" />
                  {isVietnamese ? "Xuất CSV" : "Export CSV"}
                </Button>
              )}
              {canManageRecords && (
                <Button onClick={openCreate} className="h-10 shrink-0 gap-2 lg:ml-auto">
                  <Plus className="h-4 w-4" />
                  {isVietnamese ? "Thêm hàng hoá" : "Add product"}
                </Button>
              )}
            </div>
          }
        />

        {/* Search and Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isVietnamese ? "Tìm hàng hoá, dịch vụ hoặc mã SKU" : "Search products, services, or SKU"}
              className="pl-9"
            />
          </div>

          <div className="inline-flex rounded-xl border bg-muted/40 p-1 shrink-0">
            {(
              [
                { key: "active", vi: "Đang kinh doanh", en: "Active" },
                { key: "archived", vi: "Đã ngưng", en: "Inactive" },
                { key: "all", vi: "Tất cả", en: "All" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setStatusFilter(f.key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === f.key
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isVietnamese ? f.vi : f.en}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingState label={isVietnamese ? "Đang mở danh sách hàng hoá…" : "Opening your product list…"} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={
              search
                ? isVietnamese
                  ? "Không tìm thấy hàng hoá phù hợp"
                  : "No products match that search"
                : isVietnamese
                ? "Doanh nghiệp của bạn bán gì?"
                : "What does your business sell?"
            }
            description={
              search
                ? isVietnamese
                  ? "Hãy thử tên hoặc mã hàng hoá khác."
                  : "Try the product name or code."
                : isVietnamese
                ? "Thêm hàng hoá hoặc dịch vụ cùng giá bán, giá vốn và số lượng tồn kho khởi tạo."
                : "Add your products or services with their selling price, cost price, and initial stock."
            }
            action={!search && canManageRecords && <Button onClick={openCreate}>{isVietnamese ? "Thêm hàng hoá đầu tiên" : "Add first product"}</Button>}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const stock = product.stockQuantity ?? 0;
                const minLevel = product.minStockLevel ?? 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = !isOutOfStock && minLevel > 0 && stock <= minLevel;

                return (
                  <article
                    key={product.id}
                    className={`paper-card overflow-hidden transition-colors hover:border-primary/25 ${!product.isActive ? "opacity-60" : ""}`}
                  >
                    <div className="flex h-36 items-center justify-center overflow-hidden border-b bg-linear-to-br from-secondary/80 to-accent/35">
                      {product.imageDataUrl ? (
                        <img src={product.imageDataUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-10 w-10 text-primary/45" aria-hidden="true" />
                      )}
                    </div>
                    <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-base">{product.name}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {product.sku || (isVietnamese ? "Chưa có mã hàng" : "No SKU")} · {isVietnamese ? "mỗi" : "per"} {product.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {canManageRecords && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setAdjustModalProduct(product)}
                              title={isVietnamese ? "Điều chỉnh tồn kho" : "Adjust stock"}
                              aria-label={`${isVietnamese ? "Điều chỉnh tồn kho" : "Adjust stock"} ${product.name}`}
                            >
                              <SlidersHorizontal size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(product)}
                              title={isVietnamese ? "Sửa hàng hoá" : "Edit product"}
                              aria-label={`${isVietnamese ? "Sửa" : "Edit"} ${product.name}`}
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingProduct(product)}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title={isVietnamese ? "Xoá hàng hoá" : "Delete product"}
                              aria-label={`${isVietnamese ? "Xoá" : "Delete"} ${product.name}`}
                            >
                              <Trash2 size={15} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">{isVietnamese ? "Giá bán" : "Selling Price"}</span>
                        <span className="tabular-nums text-xl font-bold text-foreground">
                          {businessMoney(product.defaultPrice, product.currency)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                        <span>{isVietnamese ? "Giá vốn" : "Cost Price"}</span>
                        <span className="tabular-nums font-medium">
                          {businessMoney(product.costPrice ?? 0, product.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Stock inventory badge & Quick adjust link */}
                    <div className="mt-4 pt-3 border-t border-dashed flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            {isVietnamese ? "Hết hàng" : "Out of stock"}
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            {isVietnamese ? `Sắp hết: ${stock} ${product.unit}` : `Low stock: ${stock} ${product.unit}`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-medium">
                            {isVietnamese ? `Tồn kho: ${stock} ${product.unit}` : `Stock: ${stock} ${product.unit}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHistoryModalProduct(product)}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                        >
                          {isVietnamese ? "Lịch sử" : "History"}
                        </button>
                        {!product.isActive && (
                          <span className="text-xs font-bold text-amber-700">
                            {isVietnamese ? "Không hoạt động" : "Inactive"}
                          </span>
                        )}
                      </div>
                    </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={20}
              onPageChange={setPage}
              itemName={isVietnamese ? "sản phẩm" : "products"}
            />
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? isVietnamese
                  ? "Sửa hàng hoá hoặc dịch vụ"
                  : "Edit product or service"
                : isVietnamese
                ? "Thêm hàng hoá hoặc dịch vụ"
                : "Add product or service"}
            </DialogTitle>
            <DialogDescription>
              {isVietnamese
                ? "Lưu thông tin bán hàng, tồn kho và ảnh nhận diện cho mặt hàng này."
                : "Keep this item's sales, inventory, and identifying image together."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <RecordImageField
              label={isVietnamese ? "Ảnh hàng hoá" : "Product image"}
              helpText={isVietnamese ? "JPEG, PNG hoặc WebP. Ảnh lớn sẽ tự động được thu nhỏ." : "JPEG, PNG, or WebP. Large images are resized automatically."}
              value={form.imageDataUrl}
              onChange={(value, removed) => setForm({ ...form, imageDataUrl: value, removeImage: removed })}
            />
            <div className="space-y-2">
              <Label htmlFor="product-name">{isVietnamese ? "Tên hàng hoá" : "Name"} *</Label>
              <Input
                id="product-name"
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={isVietnamese ? "Ví dụ: Cà phê Robusta rang mộc" : "e.g. Roasted Coffee Beans"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-sku">{isVietnamese ? "Mã SKU / Mã vạch" : "SKU or barcode"}</Label>
                <Input
                  id="product-sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-unit">{isVietnamese ? "Đơn vị tính" : "Unit"} *</Label>
                <Input
                  id="product-unit"
                  required
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder={isVietnamese ? "kg, gói, chai, giờ…" : "kg, box, hour…"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-price">{isVietnamese ? "Giá bán" : "Selling price"} *</Label>
                <Input
                  id="product-price"
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={form.defaultPrice === 0 ? "" : form.defaultPrice}
                  onChange={(e) => setForm({ ...form, defaultPrice: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-cost">{isVietnamese ? "Giá vốn nhập" : "Cost price"}</Label>
                <Input
                  id="product-cost"
                  type="number"
                  min="0"
                  step="any"
                  value={form.costPrice === 0 ? "" : form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {editing ? (
                <div className="space-y-2">
                  <Label>{isVietnamese ? "Số lượng tồn kho" : "Stock quantity"}</Label>
                  <div className="flex items-center justify-between rounded-xl border p-2.5 bg-muted/30">
                    <span className="font-bold text-sm text-foreground">
                      {editing.stockQuantity ?? 0} {editing.unit}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setAdjustModalProduct(editing);
                      }}
                      className="h-7 text-xs gap-1"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>{isVietnamese ? "Điều chỉnh kho" : "Adjust"}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="product-stock">{isVietnamese ? "Số lượng tồn kho ban đầu" : "Initial stock quantity"}</Label>
                  <Input
                    id="product-stock"
                    type="number"
                    step="any"
                    value={form.stockQuantity === 0 ? "" : form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: e.target.value === "" ? 0 : Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="product-min-stock">{isVietnamese ? "Cảnh báo khi dưới mức" : "Min stock alert level"}</Label>
                <Input
                  id="product-min-stock"
                  type="number"
                  min="0"
                  step="any"
                  value={form.minStockLevel === 0 ? "" : form.minStockLevel}
                  onChange={(e) => setForm({ ...form, minStockLevel: e.target.value === "" ? 0 : Number(e.target.value) })}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-notes">{isVietnamese ? "Ghi chú" : "Notes"}</Label>
              <Textarea
                id="product-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={isVietnamese ? "Thông số, xuất xứ, nhà cung cấp gợi ý…" : "Specs, origin, notes…"}
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-3 rounded-xl border p-3 text-sm cursor-pointer hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={form.trackInventory ?? true}
                  onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                />
                <div className="space-y-0.5">
                  <span className="font-medium">{isVietnamese ? "Theo dõi tồn kho tự động" : "Track inventory automatically"}</span>
                  <p className="text-xs text-muted-foreground">
                    {isVietnamese ? "Trừ kho khi bán và cộng kho khi nhập hàng." : "Deduct stock on sale and add on purchase."}
                  </p>
                </div>
              </label>

              {editing && (
                <label className="flex items-center gap-3 rounded-xl border p-3 text-sm cursor-pointer hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  {isVietnamese ? "Đang kinh doanh (có sẵn cho đơn bán mới)" : "Available for new sales"}
                </label>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button disabled={save.isPending}>
                {save.isPending ? t("common.saving") : isVietnamese ? "Lưu hàng hoá" : "Save product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SafeDeleteDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        recordType={isVietnamese ? "hàng hoá" : "product"}
        recordName={deletingProduct?.name ?? ""}
        historyAware
        isPending={remove.isPending}
        onConfirm={() => deletingProduct && remove.mutate(deletingProduct)}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        open={!!adjustModalProduct}
        onOpenChange={(open) => !open && setAdjustModalProduct(null)}
        product={adjustModalProduct}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["products-paged"] });
        }}
      />

      {/* Stock Adjustment History Modal */}
      <StockAdjustmentHistoryModal
        open={!!historyModalProduct || globalHistoryOpen}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryModalProduct(null);
            setGlobalHistoryOpen(false);
          }
        }}
        productId={historyModalProduct?.id}
        productName={historyModalProduct?.name}
      />
    </DashboardLayout>
  );
}
