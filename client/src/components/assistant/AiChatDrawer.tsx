import { useEffect, useRef, useState } from "react";
import { isAiConsentDeclined } from "@/lib/aiConsent";
import { useLatestCallback } from "@/hooks/useLatestCallback";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  History,
  Loader2,
  Maximize2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { businessService } from "@/services/businessService";
import { InteractiveProposalCard } from "./InteractiveProposalCard";
import { ChatMessageContent } from "./ChatMessageContent";
import {
  aiAssistantService,
  applyActionExecutionToProposal,
  AiActionInputOverrides,
  AiActionProposalResponse,
  AiAgentToolCallInfo,
  AiConversationMessage,
  AiConversationSummary,
} from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";
import { contextFromPath } from "./assistantContext";
import { getSyncedAiConversationId, publishAiConversationSync, setSyncedAiConversationId, subscribeToAiConversationSync } from "./assistantSync";

interface AiChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
  canMutate?: boolean;
  draftPrompt?: string;
}

export function AiChatDrawer({
  open,
  onOpenChange,
  currency = "VND",
  canMutate = true,
  draftPrompt,
}: AiChatDrawerProps) {
  const { isVietnamese } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncSource = useRef(crypto.randomUUID()).current;
  const conversationLoad = useRef(0);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const decisionInFlight = useRef(false);
  const [currentToolSummary, setCurrentToolSummary] = useState<string | null>(null);

  const greeting: AiConversationMessage = {
    id: "welcome",
    role: "assistant",
    content: isVietnamese
      ? "Xin chào! Tôi là Tenvora Agent. Tôi có thể truy vấn trực tiếp kho hàng, doanh thu, công nợ khách hàng, nợ nhà cung cấp, hoặc giúp bạn chuẩn bị ghi nhận giao dịch an toàn."
      : "Hello! I am Tenvora Agent. I have real-time access to your store inventory, revenue, customer balances, and supplier payables. Ask questions or tell me what to prepare.",
    createdAt: new Date().toISOString(),
  };

  useEffect(() => {
    if (!open || !draftPrompt) return;
    setInput(draftPrompt);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, [open, draftPrompt]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, isBusy]);

  const loadConversations = useLatestCallback(async (preferredId?: string | null, reloadMessages = true) => {
    const request = ++conversationLoad.current;
    const res = await aiAssistantService.getConversations();
    if (request !== conversationLoad.current) return;
    if (res.success && res.data) {
      setConversations(res.data);
      if (!reloadMessages) return;
      const targetId = preferredId === null
        ? null
        : preferredId ?? activeConversationId ?? res.data[0]?.id ?? null;
      if (targetId && res.data.some((conversation) => conversation.id === targetId)) {
        await loadConversation(targetId, false);
      } else if (!targetId) {
        setActiveConversationId(null);
        setMessages([greeting]);
        setSyncedAiConversationId(null);
      } else if (res.data.length > 0) {
        await loadConversation(res.data[0].id, false);
      } else {
        setActiveConversationId(null);
        setMessages([greeting]);
        setSyncedAiConversationId(null);
      }
    } else {
      toast.error(res.message || (isVietnamese ? "Không thể tải danh sách cuộc trò chuyện." : "Could not load conversations."));
    }
  });

  const loadConversation = async (id: string, broadcast = true) => {
    const request = ++conversationLoad.current;
    setIsBusy(true);
    const res = await aiAssistantService.getConversation(id);
    if (request !== conversationLoad.current) return;
    if (res.success && res.data) {
      setActiveConversationId(id);
      setMessages(res.data.messages.length > 0 ? res.data.messages : [greeting]);
      setShowHistory(false);
      setSyncedAiConversationId(id);
      if (broadcast) publishAiConversationSync({ activeConversationId: id, reason: "selected", source: syncSource });
    } else {
      toast.error(res.message || (isVietnamese ? "Không thể tải cuộc trò chuyện." : "Could not load the conversation."));
    }
    setIsBusy(false);
  };

  const startNewConversation = (broadcast = true) => {
    ++conversationLoad.current;
    setIsBusy(false);
    setActiveConversationId(null);
    setMessages([greeting]);
    setShowHistory(false);
    setInput("");
    setSyncedAiConversationId(null);
    if (broadcast) publishAiConversationSync({ activeConversationId: null, reason: "new", source: syncSource });
  };

  useEffect(() => {
    if (open) void loadConversations(getSyncedAiConversationId());
  }, [open, loadConversations]);

  const onConversationSync = useLatestCallback((event: Parameters<Parameters<typeof subscribeToAiConversationSync>[0]>[0]) => {
    if (event.source === syncSource) return;
    setActiveConversationId(event.activeConversationId);
    if (open) {
      void loadConversations(event.activeConversationId);
    } else if (!event.activeConversationId) {
      setMessages([greeting]);
    } else {
      setMessages([]);
    }
  });
  useEffect(() => subscribeToAiConversationSync(onConversationSync), [onConversationSync]);

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await aiAssistantService.deleteConversation(id);
    if (res.success) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        startNewConversation();
      } else {
        publishAiConversationSync({ activeConversationId, reason: "deleted", source: syncSource });
      }
      toast.success(isVietnamese ? "Đã xoá cuộc trò chuyện" : "Conversation deleted");
    } else {
      toast.error(res.message || (isVietnamese ? "Không thể xoá cuộc trò chuyện." : "Could not delete the conversation."));
    }
  };

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || isBusy) return;
    ++conversationLoad.current;

    const userMsg: AiConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsBusy(true);
    setCurrentToolSummary(isVietnamese ? "Đang xử lý và kiểm tra dữ liệu…" : "Checking store data…");

    const uiContext = contextFromPath(location.pathname, location.search);

    const response = await aiAssistantService.agentChat({
      message: text,
      conversationId: activeConversationId ?? undefined,
      uiContext,
    });

    if (isAiConsentDeclined(response)) {
      setMessages((previous) => previous.filter((message) => message.id !== userMsg.id));
      setInput(text);
      setCurrentToolSummary(null);
      setIsBusy(false);
      return;
    }

    if (response.success && response.data) {
      const data = response.data;
      if (!activeConversationId) {
        setActiveConversationId(data.conversationId);
        void loadConversations(data.conversationId, false);
      }
      publishAiConversationSync({ activeConversationId: data.conversationId, reason: "changed", source: syncSource });

      const assistantMsg: AiConversationMessage = {
        id: data.messageId,
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
        toolCalls: data.toolCalls,
      };

      setMessages((prev) => {
        const actionId = data.proposal?.actionId;
        const updatesExisting = Boolean(
          actionId && prev.some((message) => message.proposal?.actionId === actionId)
        );
        const reconciled = updatesExisting
          ? prev.map((message) =>
              message.proposal?.actionId === actionId
                ? { ...message, proposal: data.proposal }
                : message
            )
          : prev;
        return [
          ...reconciled,
          { ...assistantMsg, proposal: updatesExisting ? undefined : data.proposal },
        ];
      });
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.message || (isVietnamese ? "Không thể xử lý yêu cầu lúc này." : "Could not process request."),
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setCurrentToolSummary(null);
    setIsBusy(false);
  };

  const handleDecision = async (
    messageId: string,
    proposal: AiActionProposalResponse,
    confirmed: boolean,
    input?: AiActionInputOverrides
  ): Promise<boolean> => {
    if (!proposal.actionId || isBusy || decisionInFlight.current) return false;
    const pendingSale = confirmed && proposal.intent === "create_product"
      ? proposal.details["Pending sale"]
      : null;
    decisionInFlight.current = true;
    setIsBusy(true);

    try {
    const response = await aiAssistantService.confirmAction(proposal.actionId, confirmed, input);

    if (response.success && response.data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                proposal: applyActionExecutionToProposal(proposal, response.data!, input),
              }
            : m
        )
      );
      publishAiConversationSync({ activeConversationId, reason: "changed", source: syncSource });
    } else if (activeConversationId) {
      const refreshed = await aiAssistantService.getConversation(activeConversationId);
      if (refreshed.success && refreshed.data) setMessages(refreshed.data.messages);
      publishAiConversationSync({ activeConversationId, reason: "changed", source: syncSource });
    }

    if (!response.success || !response.data) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.message || (isVietnamese ? "Lỗi khi thực hiện thao tác." : "Error completing action."),
        createdAt: new Date().toISOString(),
      }]);
    }

    if (response.success && response.data?.status === "Executed") {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
        queryClient.invalidateQueries({ queryKey: ["purchases"] }),
        queryClient.invalidateQueries({ queryKey: ["business-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["business-dashboard"] }),
      ]);
      toast.success(isVietnamese ? "Đã hoàn tất thao tác!" : "Action completed successfully!");
    }

    decisionInFlight.current = false;
    setIsBusy(false);
    if (response.success && response.data?.status === "Executed" && pendingSale) {
      await handleSend(pendingSale);
    }
    return Boolean(response.success && response.data);
    } catch {
      toast.error(isVietnamese ? "Không thể hoàn tất thao tác. Vui lòng thử lại." : "Could not complete the action. Please try again.");
      return false;
    } finally {
      decisionInFlight.current = false;
      setIsBusy(false);
    }
  };

  const handleExpandToFullPage = () => {
    onOpenChange(false);
    const query = new URLSearchParams();
    if (activeConversationId) query.set("id", activeConversationId);
    if (input.trim()) query.set("prompt", input.trim());
    const queryString = query.toString();
    navigate(queryString ? `/agent?${queryString}` : "/agent");
  };

  const quickPrompts = isVietnamese
    ? [
        "Hôm nay bán được bao nhiêu?",
        "Mặt hàng nào sắp hết kho?",
        "Ai đang nợ tiền cửa hàng?",
        "Chi 350k tiền điện hôm nay",
      ]
    : [
        "How much did we sell today?",
        "Which products are low on stock?",
        "Who owes us money?",
        "Record 350k for electricity",
      ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Slide-out Drawer Panel */}
      <aside
        aria-label="Tenvora Agent Drawer"
        className="relative z-50 flex h-full w-full flex-col border-l bg-card shadow-2xl transition-transform duration-300 ease-in-out sm:w-md md:w-lg"
      >
        {/* Drawer Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold">Tenvora Agent</h2>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Online
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isVietnamese ? "Trợ lý quản trị kinh doanh thông minh" : "Autonomous business manager"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              title={isVietnamese ? "Lịch sử cuộc trò chuyện" : "Conversation history"}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startNewConversation()}
              title={isVietnamese ? "Cuộc trò chuyện mới" : "New chat"}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExpandToFullPage}
              title={isVietnamese ? "Mở toàn màn hình" : "Open full page"}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label={isVietnamese ? "Đóng" : "Close"}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Conversation History Dropdown / Panel */}
        {showHistory && (
          <div className="border-b bg-secondary/30 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{isVietnamese ? "Các cuộc trò chuyện gần đây" : "Recent conversations"}</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => startNewConversation()}>
                <Plus className="mr-1 h-3 w-3" />
                {isVietnamese ? "Mới" : "New"}
              </Button>
            </div>
            {conversations.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                {isVietnamese ? "Chưa có cuộc trò chuyện nào." : "No saved conversations."}
              </p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => loadConversation(c.id)}
                    className={`group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary ${
                      activeConversationId === c.id ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{c.title || (isVietnamese ? "Cuộc trò chuyện" : "Conversation")}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border bg-card text-primary shadow-sm"
                }`}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-card-foreground"
                }`}
              >
                {/* Tool calls execution pills */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {m.toolCalls.map((tc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        <Wrench className="h-3 w-3 text-primary" />
                        {tc.summary}
                      </span>
                    ))}
                  </div>
                )}

                <ChatMessageContent content={m.content} />

                {/* Interactive Human-in-the-Loop Proposal Card */}
                {m.proposal && (
                  <InteractiveProposalCard
                    proposal={m.proposal}
                    busy={isBusy}
                    isVietnamese={isVietnamese}
                    currency={currency}
                    onDecision={(confirmed, actionInput) =>
                      handleDecision(m.id, m.proposal!, confirmed, actionInput)
                    }
                    onReply={(text) => handleSend(text)}
                  />
                )}
              </div>
            </div>
          ))}

          {/* Real-time thinking / tool execution indicator */}
          {isBusy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{currentToolSummary || (isVietnamese ? "Tenvora Agent đang suy nghĩ…" : "Tenvora Agent is working…")}</span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Footer / Input Bar */}
        <footer className="border-t bg-card/60 p-4 backdrop-blur-sm">
          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSend(q)}
                  className="rounded-full border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isVietnamese
                    ? "Nhắn cho Tenvora Agent (Enter để gửi, Shift+Enter xuống dòng)…"
                    : "Message Tenvora Agent (Enter to send, Shift+Enter for newline)…"
                }
                disabled={isBusy}
                rows={1}
                className="max-h-32 min-h-[44px] resize-none py-2.5 text-sm"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isBusy}
              className="h-11 w-11 shrink-0 rounded-xl"
              aria-label={isVietnamese ? "Gửi" : "Send"}
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{isVietnamese ? "Mọi thao tác tài chính đều cần bạn duyệt trước." : "Financial actions require your final approval."}</span>
            <span className="hidden sm:inline">Ctrl + K</span>
          </div>
        </footer>
      </aside>
    </div>
  );
}
