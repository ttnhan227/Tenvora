import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { registerAiConsentHandler } from "@/lib/aiConsent";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function AiDataConsent() {
  const { user } = useAuth();
  const { isVietnamese } = useLanguage();
  const [open, setOpen] = useState(false);
  const finish = useRef<(accepted: boolean) => void>();

  useEffect(() => {
    let accepted = false;
    const accountId = user?.id;
    let pending: Promise<boolean> | undefined;
    setOpen(false);
    const unregister = registerAiConsentHandler(() => {
      if (!accountId) return Promise.resolve(false);
      if (accepted) return Promise.resolve(true);
      if (!pending) {
        pending = new Promise<boolean>((resolve) => {
          finish.current = (allow) => {
            accepted = allow;
            pending = undefined;
            finish.current = undefined;
            setOpen(false);
            resolve(allow);
          };
        });
        setOpen(true);
      }
      return pending;
    });
    return () => { unregister(); finish.current?.(false); };
  }, [user?.id]);

  return <Dialog open={open} onOpenChange={(value) => { if (!value) finish.current?.(false); }}>
    <DialogContent>
      <DialogTitle>{isVietnamese ? "Trước khi dùng AI" : "Before using AI"}</DialogTitle>
      <DialogDescription>
        {isVietnamese
          ? "Tenvora gửi câu hỏi, lịch sử hội thoại và dữ liệu kinh doanh liên quan (có thể gồm tên khách hàng, nhà cung cấp, số dư, giao dịch và kho hàng) tới Google Gemini (và Mistral AI nếu Gemini không khả dụng) để trả lời và chuẩn bị thao tác. Hội thoại được lưu trên máy chủ Tenvora. Bạn xác nhận trước khi thay đổi sổ sách. AI có thể trả lời sai; tránh nhập thông tin nhạy cảm không cần thiết."
          : "Tenvora sends your question, conversation history and relevant business records (which may include customer and supplier names, balances, transactions and inventory) to Google Gemini (and Mistral AI if Gemini is unavailable) to answer and prepare actions. Conversations are stored on Tenvora's server. You confirm before records change. AI can make mistakes; avoid unnecessary sensitive information."}
      </DialogDescription>
      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">{isVietnamese ? "Chính sách quyền riêng tư" : "Privacy policy"}</a>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => finish.current?.(false)}>{isVietnamese ? "Để sau" : "Not now"}</Button>
        <Button onClick={() => finish.current?.(true)}>{isVietnamese ? "Đồng ý và tiếp tục" : "Agree and continue"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
