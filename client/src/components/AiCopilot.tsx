import React, { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { aiService, AiCopilotMessage } from "@/services/aiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Loader2, Send, X, Sparkles, CornerDownLeft } from "lucide-react";

const suggestions = [
  "What is our maximum expense approval limit?",
  "How are out-of-policy exceptions handled?",
  "Explain the automated risk scoring calculation",
  "How do I export SOX audit log evidence?",
];

export const AiCopilot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiCopilotMessage[]>([
    {
      role: "assistant",
      content:
        "Hello. I'm your VeriSpend Policy Copilot. Ask anything regarding organization spending limits, approval workflows, or compliance controls.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === "function") {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const ask = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || loading) return;

    const nextMessages: AiCopilotMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const response = await aiService.askCopilot(text, messages);
    setLoading(false);

    if (response.success && response.data) {
      setMessages([...nextMessages, { role: "assistant", content: response.data.answer }]);
    } else {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: response.error || "Unable to reach copilot service right now.",
        },
      ]);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  const handleSuggestion = (suggestion: string) => {
    if (!open) setOpen(true);
    void ask(suggestion);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-8 rounded-full px-3 text-xs font-bold shadow-lg border border-border bg-card text-foreground hover:bg-secondary gap-1.5 transition-transform hover:scale-105"
      >
        <Sparkles className="h-3.5 w-3.5 text-foreground" />
        <span>Ask Copilot</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-foreground/20 backdrop-blur-xs transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-tight text-foreground">Spend Intelligence Copilot</p>
              <p className="text-[10px] text-muted-foreground font-mono">VeriSpend v2.4 • Grounded in tenant policy</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div
                key={index}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-md px-3 py-2 ${
                    isUser
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted/50 text-foreground border border-border/80"
                  }`}
                >
                  {isUser ? (
                    message.content
                  ) : (
                    <div className="prose prose-xs dark:prose-invert max-w-none space-y-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded border border-border/40 bg-muted/20 w-fit">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing organization rules...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestion prompt pills */}
        <div className="border-t border-border/60 bg-muted/10 p-3 space-y-1.5">
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
            Suggested Queries
          </p>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestion(s)}
                className="text-[11px] px-2 py-1 rounded border border-border bg-card hover:bg-secondary text-foreground transition-colors text-left truncate max-w-full"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <form onSubmit={submit} className="p-3 border-t border-border bg-card flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about limits, policies, receipts..."
            className="flex-1 text-xs h-8"
            disabled={loading}
          />
          <Button type="submit" size="xs" disabled={loading || !input.trim()} className="gap-1 font-bold">
            <Send className="h-3 w-3" />
          </Button>
        </form>
      </aside>
    </>
  );
};
