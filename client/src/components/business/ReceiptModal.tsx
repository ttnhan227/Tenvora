import { useState } from "react";
import { Printer, Copy, Check, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sale, businessMoney } from "@/services/businessService";

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  companyName?: string;
}

export function ReceiptModal({ open, onOpenChange, sale, companyName = "Tenvora Store" }: ReceiptModalProps) {
  const { isVietnamese } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!sale) return null;

  const dateFormatted = new Date(sale.soldAt).toLocaleString(isVietnamese ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    const lines = [
      `=== ${companyName.toUpperCase()} ===`,
      `${isVietnamese ? "HÓA ĐƠN BÁN HÀNG" : "SALES RECEIPT"}`,
      `${isVietnamese ? "Mã đơn" : "Invoice"}: ${sale.saleNumber}`,
      `${isVietnamese ? "Ngày" : "Date"}: ${dateFormatted}`,
      `${isVietnamese ? "Khách hàng" : "Customer"}: ${sale.customerName}`,
      "--------------------------------",
      ...sale.items.map(
        (item) =>
          `${item.productName} (${item.quantity} ${item.unit} x ${businessMoney(item.unitPrice, sale.currency)}) = ${businessMoney(item.lineTotal, sale.currency)}`
      ),
      "--------------------------------",
      `${isVietnamese ? "Tổng tiền" : "Total"}: ${businessMoney(sale.totalAmount, sale.currency)}`,
      `${isVietnamese ? "Đã trả" : "Paid"}: ${businessMoney(sale.paidAmount, sale.currency)}`,
      `${isVietnamese ? "Còn nợ" : "Balance Due"}: ${businessMoney(sale.outstandingBalance, sale.currency)}`,
      sale.notes ? `${isVietnamese ? "Ghi chú" : "Notes"}: ${sale.notes}` : "",
      "--------------------------------",
      isVietnamese ? "Cảm ơn quý khách!" : "Thank you for your business!",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            {isVietnamese ? "Hóa đơn / Phiếu bán hàng" : "Sales Receipt Slip"}
          </DialogTitle>
        </DialogHeader>

        {/* Printable thermal receipt layout */}
        <div className="relative mt-2 rounded-xl border bg-muted/20 p-6 font-mono text-sm leading-relaxed" id="printable-receipt">
          <style>
            {`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-receipt, #printable-receipt * {
                  visibility: visible;
                }
                #printable-receipt {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 80mm;
                  margin: 0;
                  padding: 10px;
                  background: white;
                  color: black;
                  border: none;
                  font-size: 12px;
                }
              }
            `}
          </style>

          <div className="text-center space-y-1 pb-3 border-b border-dashed border-border/80">
            <h3 className="font-bold text-base tracking-wide text-foreground uppercase">{companyName}</h3>
            <p className="text-xs text-muted-foreground">{isVietnamese ? "PHIẾU BÁN HÀNG" : "SALES RECEIPT"}</p>
            <p className="text-xs font-semibold text-foreground/80">{sale.saleNumber}</p>
          </div>

          <div className="py-3 text-xs space-y-1.5 border-b border-dashed border-border/80 text-muted-foreground">
            <div className="flex justify-between">
              <span>{isVietnamese ? "Thời gian:" : "Date:"}</span>
              <span className="font-medium text-foreground">{dateFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span>{isVietnamese ? "Khách hàng:" : "Customer:"}</span>
              <span className="font-medium text-foreground">{sale.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>{isVietnamese ? "Trạng thái:" : "Status:"}</span>
              <span className="font-semibold text-foreground">{sale.paymentStatus}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-dashed border-border/80 space-y-2">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>{isVietnamese ? "Mặt hàng" : "Item"}</span>
              <span>{isVietnamese ? "Thành tiền" : "Total"}</span>
            </div>
            {sale.items.map((item) => (
              <div key={item.id} className="text-xs">
                <div className="flex justify-between font-medium text-foreground">
                  <span>{item.productName}</span>
                  <span>{businessMoney(item.lineTotal, sale.currency)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {item.quantity} {item.unit} × {businessMoney(item.unitPrice, sale.currency)}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between font-bold text-foreground text-sm">
              <span>{isVietnamese ? "TỔNG TIỀN:" : "TOTAL:"}</span>
              <span>{businessMoney(sale.totalAmount, sale.currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{isVietnamese ? "Đã thanh toán:" : "Amount Paid:"}</span>
              <span className="font-medium text-foreground">{businessMoney(sale.paidAmount, sale.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm">
              <span className={sale.outstandingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                {isVietnamese ? "Còn nợ:" : "Balance Due:"}
              </span>
              <span className={sale.outstandingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                {businessMoney(sale.outstandingBalance, sale.currency)}
              </span>
            </div>
          </div>

          {sale.notes && (
            <div className="mt-3 pt-2 border-t border-dashed border-border/80 text-[11px] text-muted-foreground italic">
              {isVietnamese ? "Ghi chú: " : "Note: "}{sale.notes}
            </div>
          )}

          {/* Dynamic VietQR Payment Code */}
          {showQr && (
            <div className="mt-3 pt-3 border-t border-dashed border-border/80 text-center space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                {isVietnamese ? "Quét mã VietQR chuyển khoản" : "Scan VietQR to Pay"}
              </p>
              <div className="flex justify-center py-1">
                <img
                  src={`https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${Math.round(sale.outstandingBalance > 0 ? sale.outstandingBalance : sale.totalAmount)}&addInfo=${encodeURIComponent(sale.saleNumber)}`}
                  alt="VietQR"
                  className="h-28 w-28 object-contain rounded-lg border bg-white p-1"
                  loading="lazy"
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">
                {sale.saleNumber} · {businessMoney(sale.outstandingBalance > 0 ? sale.outstandingBalance : sale.totalAmount, sale.currency)}
              </p>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-dashed border-border/80 text-center text-[11px] text-muted-foreground">
            {isVietnamese ? "Cảm ơn quý khách và hẹn gặp lại!" : "Thank you for your business!"}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowQr(!showQr)}
            className="gap-2"
          >
            <QrCode className="h-4 w-4" />
            {showQr
              ? isVietnamese
                ? "Ẩn mã QR"
                : "Hide QR"
              : isVietnamese
              ? "Mã VietQR"
              : "Show VietQR"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCopyText} className="gap-2">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? (isVietnamese ? "Đã sao chép!" : "Copied!") : (isVietnamese ? "Sao chép tin nhắn" : "Copy Slip Text")}
          </Button>
          <Button type="button" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            {isVietnamese ? "In hóa đơn" : "Print Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
