import React, { useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssistantMessageContent } from "@/components/assistant/AssistantMessageContent";
import apiClient from "@/services/apiClient";
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  TrendingUp,
  Clock,
  DollarSign
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: Date;
  kind?: "intro" | "answer" | "notice";
  source?: string;
}

const SUGGESTED_PROMPTS = [
  {
    icon: ShieldCheck,
    title: "Quarterly Tax Set-Aside",
    prompt: "How much should I set aside for taxes this quarter?",
  },
  {
    icon: TrendingUp,
    title: "Average Monthly Earnings",
    prompt: "What is my average monthly freelance income?",
  },
  {
    icon: Clock,
    title: "Client Payment Speed",
    prompt: "Which client pays slowest and has overdue invoices?",
  },
  {
    icon: DollarSign,
    title: "Expense Affordability",
    prompt: "Can I afford to purchase a $1,200 new MacBook for work right now?",
  },
];

export const FreelancerAssistant: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      sender: "copilot",
      text: "Hello! I am your Tenvora Financial Assistant.\n\nI can help you understand:\n- unpaid and overdue invoices\n- confirmed income and client history\n- tax-reserve planning estimates\n- what may be safe to spend\n\nAsk me what is outstanding, what changed, or what needs your attention.",
      timestamp: new Date(),
      kind: "intro",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handledQueryRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendPrompt = useCallback(async (promptToSend?: string) => {
    const text = (promptToSend ?? inputPrompt).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt("");
    setLoading(true);

    try {
      const res = await apiClient.post("/ai/query", { prompt: text });
      const payload = res.data?.data ?? res.data;
      const answer =
        payload?.response ||
        "I analyzed your workspace records: the displayed safe-to-spend amount already excludes the recorded tax reserve. Verify both against your real bank balance before making a decision.";

      const botMessage: Message = {
        id: `copilot-${Date.now()}`,
        sender: "copilot",
        text: answer,
        timestamp: new Date(),
        kind: "answer",
        source: payload?.source,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        sender: "copilot",
        text: "I couldn't reach the financial copilot engine right now. Please check your connection and try again.",
        timestamp: new Date(),
        kind: "notice",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [inputPrompt, loading]);

  // Handle URL search param like ?q=taxes or ?q=slowest
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || handledQueryRef.current === q) return;
    handledQueryRef.current = q;

    if (q === "taxes") {
      void handleSendPrompt("How much should I set aside for taxes this quarter?");
    } else if (q === "slowest") {
      void handleSendPrompt("Which client pays slowest?");
    } else if (q === "cashflow") {
      void handleSendPrompt("What changed in my cash flow recently?");
    }
  }, [handleSendPrompt, searchParams]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Financial Assistant
              </h1>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
                <Sparkles size={12} /> AI Copilot
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ask questions about your freelance earnings, tax withholding, and client cash flow.
            </p>
          </div>
        </div>

        {/* Suggested Quick Questions Grid */}
        <section className="space-y-3" aria-labelledby="suggested-questions-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="suggested-questions-heading" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Sparkles size={14} className="text-primary" /> Suggested questions
            </h2>
            <p className="text-[11px] text-muted-foreground">Start an AI-assisted review using your recorded data</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SUGGESTED_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(item.prompt)}
                className="group rounded-xl border border-border/80 bg-card p-4 text-left shadow-2xs transition-all hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center gap-2 text-primary">
                  <item.icon size={16} />
                  <span className="text-xs font-bold text-foreground group-hover:text-primary">{item.title}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">"{item.prompt}"</p>
              </button>
            ))}
          </div>
        </section>

        {/* Chat Conversation Card */}
        <div className="rounded-2xl border border-border/80 bg-card shadow-sm flex flex-col h-[560px] overflow-hidden">
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Tenvora Copilot</p>
                <p className="text-[11px] font-medium text-emerald-600">
                  ● Tenvora AI · Using your Tenvora records
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Workspace records · Planning insights
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/20 p-4 sm:p-6 space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "copilot" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={15} />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3.5 max-w-[88%] sm:max-w-[82%] text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none font-normal shadow-xs"
                      : "bg-card text-foreground rounded-tl-none border border-border/70 shadow-xs"
                  }`}
                >
                  {msg.sender === "copilot" && (
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide text-primary">
                        <Sparkles size={10} /> {msg.kind === "answer" ? "AI suggestion" : msg.kind === "notice" ? "Assistant notice" : "AI assistant"}
                      </span>
                      {msg.kind === "answer" && (
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          Tenvora AI
                        </span>
                      )}
                    </div>
                  )}
                  {msg.sender === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <AssistantMessageContent text={msg.text} />
                  )}
                  <span
                    className={`text-[10px] mt-2.5 block border-t pt-2 ${
                      msg.sender === "user" ? "text-primary-foreground/70 text-right" : "text-muted-foreground"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {msg.sender === "user" && (
                  <div className="h-8 w-8 rounded-full bg-foreground/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles size={15} />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-muted/60 border border-border/50 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                  <span>Analyzing your invoices, recorded balances, and tax settings...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Box */}
          <div className="p-4 border-t border-border/60 bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendPrompt();
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="assistant-question" className="sr-only">Ask Tenvora about your finances</label>
              <Input
                id="assistant-question"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask about your taxes, clients, or cash flow (e.g., 'How much tax do I owe?')..."
                className="h-11 text-sm bg-muted/30 focus-visible:ring-primary"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={!inputPrompt.trim() || loading}
                className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold"
              >
                <Send size={16} className="mr-1.5" /> Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FreelancerAssistant;
