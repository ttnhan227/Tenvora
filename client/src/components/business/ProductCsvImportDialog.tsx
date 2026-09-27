import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { businessMoney, businessService, ProductInput } from "@/services/businessService";

interface ProductCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

export function ProductCsvImportDialog({
  open,
  onOpenChange,
  currency = "VND",
}: ProductCsvImportDialogProps) {
  const { isVietnamese } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedProducts, setParsedProducts] = useState<ProductInput[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reset = () => {
    setParsedProducts([]);
    setFileName("");
    setIsImporting(false);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const cleaned = val.replace(/[^0-9.-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.max(0, num);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setErrorMsg(isVietnamese ? "File trống." : "File is empty.");
          return;
        }

        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setErrorMsg(
            isVietnamese
              ? "File CSV cần có ít nhất một dòng tiêu đề và một dòng dữ liệu."
              : "CSV must have at least one header and one row of data."
          );
          return;
        }

        // Detect delimiter (comma or semicolon)
        const firstLine = lines[0];
        const delimiter = firstLine.includes(";") ? ";" : ",";
        const headers = firstLine
          .split(delimiter)
          .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

        // Match column indices
        const nameIdx = headers.findIndex((h) =>
          ["tên", "tên hàng", "tên sản phẩm", "name", "product", "title"].some((k) =>
            h.includes(k)
          )
        );
        const skuIdx = headers.findIndex((h) =>
          ["mã", "mã hàng", "mã sp", "sku", "code"].some((k) => h.includes(k))
        );
        const unitIdx = headers.findIndex((h) =>
          ["đơn vị", "đvt", "unit"].some((k) => h.includes(k))
        );
        const priceIdx = headers.findIndex((h) =>
          ["giá bán", "đơn giá", "giá", "price", "retail price"].some((k) => h.includes(k))
        );
        const costIdx = headers.findIndex((h) =>
          ["giá vốn", "giá nhập", "cost", "cost price"].some((k) => h.includes(k))
        );
        const stockIdx = headers.findIndex((h) =>
          ["tồn kho", "số lượng", "tồn", "stock", "quantity", "qty"].some((k) =>
            h.includes(k)
          )
        );

        if (nameIdx === -1) {
          setErrorMsg(
            isVietnamese
              ? "Không tìm thấy cột Tên sản phẩm. Vui lòng đặt tiêu đề cột là 'Tên hàng' hoặc 'Name'."
              : "Could not find Product Name column. Please use 'Name' or 'Product' header."
          );
          return;
        }

        const items: ProductInput[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i]
            .split(delimiter)
            .map((c) => c.trim().replace(/^["']|["']$/g, ""));

          const name = cols[nameIdx]?.trim();
          if (!name) continue;

          items.push({
            name,
            sku: skuIdx !== -1 ? cols[skuIdx]?.trim() || undefined : undefined,
            unit: unitIdx !== -1 ? cols[unitIdx]?.trim() || "item" : "item",
            defaultPrice: priceIdx !== -1 ? parseNumber(cols[priceIdx]) : 0,
            costPrice: costIdx !== -1 ? parseNumber(cols[costIdx]) : 0,
            stockQuantity: stockIdx !== -1 ? parseNumber(cols[stockIdx]) : 0,
            isActive: true,
          });
        }

        if (items.length === 0) {
          setErrorMsg(isVietnamese ? "Không có dữ liệu hợp lệ để nhập." : "No valid product data found.");
        } else {
          setParsedProducts(items);
        }
      } catch {
        setErrorMsg(isVietnamese ? "Lỗi đọc file CSV." : "Error reading CSV file.");
      }
    };

    reader.readAsText(file, "UTF-8");
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "Tên hàng,Mã hàng,Đơn vị,Giá bán,Giá vốn,Tồn kho\n" +
      "Cà phê sữa đá,CF01,ly,25000,12000,50\n" +
      "Trà đào cam sả,TD02,ly,30000,14000,30\n" +
      "Bánh mì que,BM03,cái,15000,8000,20\n";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau_nhap_hang_hoa_tenvora.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = async () => {
    if (parsedProducts.length === 0 || isImporting) return;
    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedProducts.length });

    let successCount = 0;
    for (let i = 0; i < parsedProducts.length; i++) {
      try {
        await businessService.createProduct(parsedProducts[i]);
        successCount++;
      } catch {
        // Continue on individual failures
      }
      setImportProgress({ current: i + 1, total: parsedProducts.length });
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] }),
    ]);

    setIsImporting(false);
    onOpenChange(false);
    reset();

    toast.success(
      isVietnamese
        ? `Đã nhập thành công ${successCount}/${parsedProducts.length} hàng hoá!`
        : `Successfully imported ${successCount}/${parsedProducts.length} products!`
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isImporting) { onOpenChange(v); reset(); } }}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {isVietnamese ? "Nhập danh sách hàng hoá từ file CSV" : "Import Products from CSV"}
          </DialogTitle>
          <DialogDescription>
            {isVietnamese
              ? "Tải lên file danh mục hàng hoá từ Excel hoặc phần mềm cũ để đưa toàn bộ vào kho Tenvora."
              : "Upload your product catalog from Excel or prior software to populate your inventory."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          {/* File input & template download */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-border p-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {fileName || (isVietnamese ? "Chọn file .csv từ máy tính" : "Choose .csv file")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese ? "Hỗ trợ định dạng CSV UTF-8" : "Supports UTF-8 CSV"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-xs h-8"
              >
                {isVietnamese ? "Tải file mẫu" : "Download Template"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-8"
              >
                {isVietnamese ? "Chọn file" : "Select File"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">
                  {isVietnamese
                    ? `Xem trước: ${parsedProducts.length} mặt hàng hợp lệ`
                    : `Preview: ${parsedProducts.length} valid items`}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {isVietnamese ? "Hiển thị tối đa 5 dòng đầu" : "Showing first 5 rows"}
                </span>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">{isVietnamese ? "Tên hàng" : "Name"}</th>
                      <th className="p-2.5">{isVietnamese ? "Mã SKU" : "SKU"}</th>
                      <th className="p-2.5">{isVietnamese ? "Đơn vị" : "Unit"}</th>
                      <th className="p-2.5 text-right">{isVietnamese ? "Giá bán" : "Price"}</th>
                      <th className="p-2.5 text-right">{isVietnamese ? "Tồn kho" : "Stock"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {parsedProducts.slice(0, 5).map((p, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2.5 font-medium">{p.name}</td>
                        <td className="p-2.5 text-muted-foreground">{p.sku || "—"}</td>
                        <td className="p-2.5">{p.unit}</td>
                        <td className="p-2.5 text-right font-mono">
                          {businessMoney(p.defaultPrice, currency)}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {p.stockQuantity ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Importing progress */}
          {isImporting && (
            <div className="space-y-2 rounded-xl border p-4 bg-muted/40">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {isVietnamese ? "Đang nhập dữ liệu vào kho…" : "Importing products…"}
                </span>
                <span>
                  {importProgress.current} / {importProgress.total}
                </span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{
                    width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isImporting}
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            {isVietnamese ? "Hủy" : "Cancel"}
          </Button>
          <Button
            type="button"
            disabled={parsedProducts.length === 0 || isImporting}
            onClick={handleExecuteImport}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {isVietnamese
              ? `Nhập ${parsedProducts.length} sản phẩm`
              : `Import ${parsedProducts.length} Products`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
