import { useState } from "react";
import { Check, Copy, MessageCircle, Phone, Send, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { BusinessCustomer, businessMoney, Sale } from "@/services/businessService";
import { toast } from "sonner";

interface DebtReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: BusinessCustomer;
  sales: Sale[];
  storeName?: string;
}

export function DebtReminderModal({
  open,
  onOpenChange,
  customer,
  sales,
  storeName = "Cửa hàng Tenvora",
}: DebtReminderModalProps) {
  const { isVietnamese } = useLanguage();
  const [copied, setCopied] = useState(false);

  const unpaidSales = sales.filter((s) => s.status === "Posted" && s.outstandingBalance > 0);
  const todayStr = new Date().toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const cleanPhone = customer.phone?.replace(/[^0-9+]/g, "") || "";

  const defaultMessage = isVietnamese
    ? `Kính gửi Quý khách ${customer.name},
${storeName} xin gửi thông báo đối soát công nợ tính đến ngày ${todayStr}:

- Tổng dư nợ hiện tại: ${businessMoney(customer.outstandingBalance, customer.currency)}
- Chi tiết các đơn hàng chưa thanh toán:
${unpaidSales.map((s) => `  • Đơn ${s.saleNumber} (${new Date(s.soldAt).toLocaleDateString("vi-VN")}): còn nợ ${businessMoney(s.outstandingBalance, s.currency)}`).join("\n")}

Quý khách vui lòng kiểm tra và thanh toán qua chuyển khoản ngân hàng hoặc ghé cửa hàng sớm nhất nhé.
Xin chân thành cảm ơn Quý khách!`
    : `Dear ${customer.name},
${storeName} is sending an account balance update as of ${todayStr}:

- Current Outstanding Balance: ${businessMoney(customer.outstandingBalance, customer.currency)}
- Unpaid Invoices:
${unpaidSales.map((s) => `  • Invoice ${s.saleNumber} (${new Date(s.soldAt).toLocaleDateString()}): ${businessMoney(s.outstandingBalance, s.currency)}`).join("\n")}

Please review and arrange payment at your earliest convenience.
Thank you for your business!`;

  const [messageText, setMessageText] = useState(defaultMessage);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast.success(isVietnamese ? "Đã sao chép nội dung tin nhắn!" : "Copied reminder message to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(isVietnamese ? "Không thể sao chép tin nhắn." : "Failed to copy message.");
    }
  };

  const handleOpenZalo = () => {
    handleCopy();
    if (cleanPhone) {
      window.open(`https://zalo.me/${cleanPhone}`, "_blank", "noopener,noreferrer");
    } else {
      window.open("https://chat.zalo.me", "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            {isVietnamese ? "Gửi thông báo nhắc nợ" : "Send Debt Reminder"}
          </DialogTitle>
          <DialogDescription>
            {isVietnamese
              ? `Tạo thông báo đối soát công nợ lịch sự cho khách hàng ${customer.name}.`
              : `Generate a polite, clear debt balance statement for ${customer.name}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-xs dark:border-sky-900/50 dark:bg-sky-950/20">
            <div className="flex justify-between items-center font-medium">
              <span>{isVietnamese ? "Khách hàng:" : "Customer:"} <strong>{customer.name}</strong></span>
              <span className="text-amber-700 dark:text-amber-400 font-bold">
                {businessMoney(customer.outstandingBalance, customer.currency)}
              </span>
            </div>
            {customer.phone && (
              <p className="mt-1 text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {customer.phone}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              {isVietnamese ? "Nội dung tin nhắn (có thể chỉnh sửa):" : "Message text (editable):"}
            </label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={8}
              className="font-mono text-xs leading-relaxed resize-none bg-background"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? (isVietnamese ? "Đã sao chép" : "Copied!") : (isVietnamese ? "Sao chép tin nhắn" : "Copy Message")}
          </Button>

          {cleanPhone && (
            <Button
              type="button"
              variant="outline"
              asChild
              className="gap-1.5 text-xs"
            >
              <a href={`sms:${cleanPhone}?body=${encodeURIComponent(messageText)}`}>
                <Smartphone className="h-3.5 w-3.5" />
                {isVietnamese ? "Gửi SMS" : "Send SMS"}
              </a>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleOpenZalo}
            className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {isVietnamese ? "Mở Zalo nhắn tin" : "Open Zalo Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
