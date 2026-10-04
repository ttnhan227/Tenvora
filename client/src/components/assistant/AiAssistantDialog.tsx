import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Loader2, Send, Sparkles, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiAssistantService, AiActionProposalResponse, applyActionExecutionToProposal } from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";
import { contextFromPath } from "./assistantContext";
import { ChatMessageContent } from "./ChatMessageContent";

interface ChatMessage {
  id: string;
  sender: "user" | "tenvora";
  text: string;
  proposal?: AiActionProposalResponse;
  tone?: "success" | "normal";
}

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
  canMutate?: boolean;
}

export function AiAssistantDialog({ open, onOpenChange, canMutate = true }: AiAssistantDialogProps) {
  const { isVietnamese } = useLanguage();
  const location = useLocation();
  const queryClient = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const greeting = isVietnamese
    ? "Bạn có thể hỏi về doanh thu, công nợ và chi phí—hoặc bảo Tenvora chuẩn bị một giao dịch. Thao tác tài chính luôn được xem trước để bạn xác nhận."
    : "Ask about revenue, balances, and expenses—or tell Tenvora to prepare a transaction. Financial actions are always previewed for your confirmation.";
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", sender: "tenvora", text: greeting }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMessages((current) => current.length === 1 && current[0].id === "welcome" ? [{ ...current[0], text: greeting }] : current);
  }, [greeting]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (value?: string) => {
    const text = (value ?? input).trim();
    if (!text || busy) return;
    const pendingMessage = [...messages].reverse().find(
      (message) => message.proposal?.actionId && message.proposal.requiresConfirmation
    );
    setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "user", text }]);
    setInput("");
    if (pendingMessage?.proposal && /^(yes|y|confirm|confirmed|ok|okay|đồng ý|dong y|xác nhận|xac nhan|ừ|uh|có)$/i.test(text)) {
      await decide(pendingMessage.id, pendingMessage.proposal, true);
      return;
    }
    if (pendingMessage?.proposal && /^(no|n|cancel|stop|không|khong|hủy|huỷ|huy)$/i.test(text)) {
      await decide(pendingMessage.id, pendingMessage.proposal, false);
      return;
    }
    setBusy(true);
    const uiContext = contextFromPath(location.pathname, location.search);
    if (looksLikeAction(text) && !canMutate) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), sender: "tenvora",
        text: isVietnamese
          ? "Vai trò của bạn chỉ có quyền xem dữ liệu. Hãy nhờ quản trị viên hoặc quản lý vận hành thực hiện thay đổi này."
          : "Your role has read-only access. Ask an administrator or operations manager to make this change.",
      }]);
    } else if (looksLikeAction(text)) {
      const response = await aiAssistantService.proposeAction(text, uiContext);
      setMessages((current) => [...current, response.success && response.data
        ? { id: crypto.randomUUID(), sender: "tenvora", text: response.data.summary, proposal: response.data }
        : { id: crypto.randomUUID(), sender: "tenvora", text: response.message || fallbackError(isVietnamese) }]);
    } else {
      const response = await aiAssistantService.chat(text, uiContext);
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), sender: "tenvora",
        text: response.success && response.data ? response.data.reply : response.message || fallbackError(isVietnamese),
      }]);
    }
    setBusy(false);
  };

  const decide = async (messageId: string, proposal: AiActionProposalResponse, confirmed: boolean) => {
    if (!proposal.actionId || busy) return;
    setBusy(true);
    const response = await aiAssistantService.confirmAction(proposal.actionId, confirmed);
    if (response.success && response.data) {
      setMessages((current) => current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              proposal: message.proposal
                ? applyActionExecutionToProposal(message.proposal, response.data!)
                : undefined,
            }
          : message
      ));
    }
    if (!response.success || !response.data) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), sender: "tenvora",
        text: response.message || fallbackError(isVietnamese),
      }]);
    }
    if (response.success && confirmed) await queryClient.invalidateQueries();
    setBusy(false);
  };

  const quickQuestions = isVietnamese
    ? ["Hôm nay bán được bao nhiêu?", "Ai đang nợ tiền?", "Hôm nay đã chi bao nhiêu?"]
    : ["How much did we sell today?", "Who owes us money?", "What did we spend today?"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></span>
            <div><DialogTitle>{isVietnamese ? "Tenvora" : "Tenvora"}</DialogTitle><DialogDescription>{isVietnamese ? "Hỏi hoặc thực hiện công việc ngay trong không gian hiện tại" : "Ask or act in the current workspace context"}</DialogDescription></div>
          </div>
        </DialogHeader>

        <div className="flex h-104 flex-col gap-3 overflow-y-auto bg-secondary/15 p-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-2 ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${message.sender === "user" ? "bg-primary text-primary-foreground" : "border bg-card text-primary"}`}>{message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</span>
              <div className={`max-w-[84%] rounded-2xl p-3 text-sm shadow-sm ${message.sender === "user" ? "bg-primary text-primary-foreground" : message.tone === "success" ? "border border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100" : "border bg-card"}`}>
                <ChatMessageContent content={message.text} />
                {message.proposal && <ProposalCard
                  proposal={message.proposal}
                  busy={busy}
                  onDecision={(confirmed) => void decide(message.id, message.proposal!, confirmed)}
                  onCandidate={(label) => {
                    const messageIndex = messages.findIndex((item) => item.id === message.id);
                    const original = messages.slice(0, messageIndex).reverse().find((item) => item.sender === "user")?.text ?? "";
                    void send(`${original} — ${label}`);
                  }}
                  isVietnamese={isVietnamese}
                />}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{isVietnamese ? "Tenvora đang kiểm tra dữ liệu…" : "Tenvora is checking workspace data…"}</div>}
          <div ref={endRef} />
        </div>

        <div className="border-t p-4">
          {messages.length === 1 && <div className="mb-2 flex flex-wrap gap-1.5">{quickQuestions.map((question) => <button key={question} type="button" onClick={() => void send(question)} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">{question}</button>)}</div>}
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={isVietnamese ? "Hỏi hoặc yêu cầu Tenvora…" : "Ask or tell Tenvora what to do…"} disabled={busy} />
            <Button type="submit" size="icon" disabled={!input.trim() || busy} aria-label={isVietnamese ? "Gửi" : "Send"}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProposalCard({ proposal, busy, onDecision, onCandidate, isVietnamese }: { proposal: AiActionProposalResponse; busy: boolean; onDecision: (confirmed: boolean) => void; onCandidate: (label: string) => void; isVietnamese: boolean }) {
  const isTerminal = ["Executed", "Cancelled", "Expired", "Failed"].includes(proposal.status);
  return (
    <div className="mt-3 border-t pt-3">
      {isTerminal && <p className="text-xs font-semibold text-muted-foreground">
        {proposal.status === "Executed"
          ? (isVietnamese ? "Thao tác đã hoàn tất." : "Action completed.")
          : (isVietnamese ? "Đề xuất này không còn đang chờ xử lý." : "This proposal is no longer pending.")}
      </p>}
      {Object.keys(proposal.details).length > 0 && <dl className="grid gap-2 sm:grid-cols-2">{Object.entries(proposal.details).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-[11px] opacity-65">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>}
      {proposal.candidates && proposal.candidates.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{proposal.candidates.map((candidate) => <button key={candidate.id} type="button" disabled={busy} onClick={() => onCandidate(candidate.label)} className="rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-50">{candidate.label}</button>)}</div>}
      <div className="mt-3 flex justify-end gap-2">
        {!isTerminal && proposal.actionId && <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecision(false)}><X className="h-3.5 w-3.5" />{isVietnamese ? "Hủy" : "Cancel"}</Button>}
        {!isTerminal && proposal.requiresConfirmation && proposal.actionId && <Button size="sm" disabled={busy} onClick={() => onDecision(true)} className="bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{isVietnamese ? "Xác nhận" : "Confirm"}</Button>}
      </div>
    </div>
  );
}

function looksLikeAction(text: string) {
  return /(vừa trả|trả nợ|thanh toán|paid|repaid|pay|ghi|record|thêm|tạo|create|add|bán cho|sold|chi\s|spent|expense|mua từ|nhập hàng|purchase|đổi|sửa|cập nhật|change|update|edit|xóa|xoá|lưu trữ|archive|remove|delete|hủy|huỷ|cancel|void|currency|tiền tệ)/i.test(text);
}

function fallbackError(isVietnamese: boolean) {
  return isVietnamese ? "Tenvora chưa thể hoàn tất yêu cầu này. Vui lòng thử lại." : "Tenvora couldn't complete that request. Please try again.";
}
