import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  aiAssistantService,
  applyActionExecutionToProposal,
  AiActionInputOverrides,
  AiActionProposalResponse,
  AiConversationMessage,
  AiConversationSummary,
} from "@/services/aiService";
import { businessMoney, businessService } from "@/services/businessService";
import { InteractiveProposalCard } from "@/components/assistant/InteractiveProposalCard";
import { ChatMessageContent } from "@/components/assistant/ChatMessageContent";
import { getSyncedAiConversationId, publishAiConversationSync, setSyncedAiConversationId, subscribeToAiConversationSync } from "@/components/assistant/assistantSync";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AgentChatPage() {
  const { isVietnamese, t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncSource = useRef(crypto.randomUUID()).current;

  const initialId = params.get("id");
  const initialPrompt = params.get("prompt");
  const [activeId, setActiveId] = useState<string | null>(initialId ?? getSyncedAiConversationId() ?? null);
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ["business-dashboard", "today"],
    queryFn: () => businessService.getDashboard("today"),
  });
  const dash = dashboardQuery.data;
  const currency = dash?.currency ?? "VND";

  const greeting: AiConversationMessage = {
    id: "welcome",
    role: "assistant",
    content: isVietnamese
      ? "Xin chào! Tôi là Tenvora Agent—quản lý kinh doanh thông minh của bạn. Tôi có thể kiểm tra kho hàng, theo dõi công nợ, phân tích doanh thu hoặc chuẩn bị các giao dịch bán hàng, chi phí, nhập hàng cho bạn xác nhận."
      : "Hello! I am Tenvora Agent—your autonomous business manager. I have direct access to your inventory, customer balances, supplier payables, and sales. Ask me anything or instruct me to prepare transactions.",
    createdAt: new Date().toISOString(),
  };

  useEffect(() => {
    const target = initialId ?? getSyncedAiConversationId();
    void loadConversations(target);
    if (initialId) {
      setSyncedAiConversationId(initialId);
      publishAiConversationSync({ activeConversationId: initialId, reason: "selected", source: syncSource });
    }
  }, []);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      window.requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (initialId && initialId !== activeId) {
      loadConversation(initialId);
    }
  }, [initialId]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, isBusy]);

  const loadConversations = async (preferredId?: string | null) => {
    const res = await aiAssistantService.getConversations();
    if (res.success && res.data) {
      setConversations(res.data);
      const targetId = preferredId === null
        ? null
        : preferredId ?? activeId ?? res.data[0]?.id ?? null;
      if (targetId && res.data.some((conversation) => conversation.id === targetId)) {
        await loadConversation(targetId, false);
      } else if (!targetId) {
        setActiveId(null);
        setParams({}, { replace: true });
        setMessages([greeting]);
        setSyncedAiConversationId(null);
      } else if (res.data.length > 0) {
        await loadConversation(res.data[0].id, false);
      } else {
        setActiveId(null);
        setParams({}, { replace: true });
        setMessages([greeting]);
        setSyncedAiConversationId(null);
      }
    }
  };

  const loadConversation = async (id: string, broadcast = true) => {
    setIsBusy(true);
    const res = await aiAssistantService.getConversation(id);
    if (res.success && res.data) {
      setActiveId(id);
      setParams({ id }, { replace: true });
      setMessages(res.data.messages.length > 0 ? res.data.messages : [greeting]);
      setSyncedAiConversationId(id);
      if (broadcast) publishAiConversationSync({ activeConversationId: id, reason: "selected", source: syncSource });
    }
    setIsBusy(false);
  };

  const handleNewChat = (broadcast = true) => {
    setActiveId(null);
    setParams({}, { replace: true });
    setMessages([greeting]);
    setInput("");
    setSyncedAiConversationId(null);
    if (broadcast) publishAiConversationSync({ activeConversationId: null, reason: "new", source: syncSource });
  };

  useEffect(() => subscribeToAiConversationSync((event) => {
    if (event.source === syncSource) return;
    void loadConversations(event.activeConversationId);
  }), [syncSource]);

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await aiAssistantService.deleteConversation(id);
    if (res.success) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        handleNewChat();
      } else {
        publishAiConversationSync({ activeConversationId: activeId, reason: "deleted", source: syncSource });
      }
      toast.success(isVietnamese ? "Đã xoá cuộc trò chuyện" : "Conversation deleted");
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt ?? input).trim();
    if (!text || isBusy) return;

    const userMsg: AiConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsBusy(true);
    setCurrentTool(isVietnamese ? "Đang truy vấn dữ liệu kinh doanh…" : "Querying store database…");

    const response = await aiAssistantService.agentChat({
      message: text,
      conversationId: activeId ?? undefined,
    });

    if (response.success && response.data) {
      const data = response.data;
      if (!activeId) {
        setActiveId(data.conversationId);
        setParams({ id: data.conversationId }, { replace: true });
        loadConversations(data.conversationId);
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
          content: response.message || (isVietnamese ? "Không thể xử lý yêu cầu lúc này." : "Could not complete request."),
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setCurrentTool(null);
    setIsBusy(false);
  };

  const handleDecision = async (
    messageId: string,
    proposal: AiActionProposalResponse,
    confirmed: boolean,
    input?: AiActionInputOverrides
  ): Promise<boolean> => {
    if (!proposal.actionId || isBusy) return false;
    const pendingSale = confirmed && proposal.intent === "create_product"
      ? proposal.details["Pending sale"]
      : null;
    setIsBusy(true);

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
      publishAiConversationSync({ activeConversationId: activeId, reason: "changed", source: syncSource });
    } else if (activeId) {
      // Validation failures stay pending; execution failures become Failed.
      // Reload the authoritative proposal state instead of guessing locally.
      const refreshed = await aiAssistantService.getConversation(activeId);
      if (refreshed.success && refreshed.data) setMessages(refreshed.data.messages);
      publishAiConversationSync({ activeConversationId: activeId, reason: "changed", source: syncSource });
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

    setIsBusy(false);
    if (response.success && response.data?.status === "Executed" && pendingSale) {
      await handleSend(pendingSale);
    }
    return Boolean(response.success && response.data);
  };

  const suggestions = isVietnamese
    ? [
        "Hôm nay bán được bao nhiêu và lợi nhuận ước tính là bao nhiêu?",
        "Kiểm tra tồn kho: mặt hàng nào sắp hết?",
        "Ai đang nợ tiền nhiều nhất và số điện thoại là gì?",
        "Chi 450k tiền vận chuyển hôm nay",
      ]
    : [
        "What are today's sales and estimated net profit?",
        "Check inventory: what items are low on stock?",
        "Who owes the most debt and what is their phone number?",
        "Record 450k for transport expenses today",
      ];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-7.5rem)] gap-4">
        {/* Left Column: Conversation Threads & Store Pulse */}
        <aside aria-label="Conversation history" className="hidden w-72 shrink-0 flex-col rounded-2xl border bg-card p-3 shadow-sm md:flex lg:w-80">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-bold text-sm">Tenvora Agent</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleNewChat()} className="h-8 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              {isVietnamese ? "Mới" : "New"}
            </Button>
          </div>

          {/* Quick Store Pulse */}
          {dash && (
            <div className="mt-3 rounded-xl bg-secondary/50 p-2.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isVietnamese ? "Bán hôm nay" : "Today Sales"}</span>
                <span className="font-bold">{businessMoney(dash.todaySales, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isVietnamese ? "Khách đang nợ" : "Receivables"}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {businessMoney(dash.outstandingCustomers, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Threads List */}
          <div className="mt-3 flex-1 overflow-y-auto space-y-1 pr-1">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Cuộc trò chuyện" : "Conversations"}
            </p>
            {conversations.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                {isVietnamese ? "Chưa có cuộc trò chuyện nào." : "No saved chats."}
              </p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors hover:bg-secondary ${
                    activeId === c.id ? "bg-secondary font-semibold text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{c.title || (isVietnamese ? "Cuộc trò chuyện" : "Conversation")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded"
                    title={isVietnamese ? "Xoá" : "Delete"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center: Main Agent Chat Stream */}
        <main aria-label="Agent chat workspace" className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Top Chat Bar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-sm font-bold">
                  {conversations.find((c) => c.id === activeId)?.title ?? "Tenvora Agent"}
                </h1>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isVietnamese ? "Sẵn sàng hỗ trợ & điều hành" : "Ready to assist & operate"}
                </span>
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={() => handleNewChat()} className="md:hidden h-8 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              {isVietnamese ? "Mới" : "New"}
            </Button>
          </header>

          {/* Messages Flow */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs shadow-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card text-primary"
                  }`}
                >
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </span>

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card text-card-foreground"
                  }`}
                >
                  {/* Tool execution badges */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {m.toolCalls.map((tc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border/40"
                        >
                          <Wrench className="h-3 w-3 text-primary" />
                          {tc.summary}
                        </span>
                      ))}
                    </div>
                  )}

                  <ChatMessageContent content={m.content} />

                  {/* Proposal Action Card */}
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

            {isBusy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>{currentTool || (isVietnamese ? "Tenvora Agent đang suy nghĩ…" : "Tenvora Agent is thinking…")}</span>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Sticky Bottom Input Bar */}
          <footer className="border-t bg-card/60 p-4 backdrop-blur-sm">
            {messages.length <= 2 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSend(s)}
                    className="rounded-full border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                  >
                    {s}
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
                    ? "Nhắn yêu cầu hoặc câu hỏi cho Tenvora Agent (Enter để gửi)…"
                    : "Ask or tell Tenvora Agent what to check or record (Enter to send)…"
                }
                disabled={isBusy}
                rows={1}
                className="max-h-36 min-h-[48px] resize-none py-3 text-sm rounded-xl"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isBusy}
                className="h-12 w-12 shrink-0 rounded-xl"
              >
                {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </footer>
        </main>
      </div>
    </DashboardLayout>
  );
}
