import React, { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, Loader2, Send, X, Shield, BookOpen, HelpCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "How does double-entry balancing work?",
  "What is the settlement clearing schedule?",
  "Explain compensating reversal policy",
  "How do I trace an account ledger variance?",
];

export const AiCopilot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Tenvora Operations Terminal. Ask questions regarding accounting invariants, settlement batches, double-entry verification, or compliance protocols.",
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

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      let reply = "Tenvora enforces strict financial integrity: every transfer executes inside an atomic transaction with row-level locks, generating equal debit and credit journal lines. Reversals are recorded as compensating transactions to preserve ledger immutability.";
      if (text.toLowerCase().includes("settlement")) {
        reply = "Daily settlement batches aggregate posted transactions per currency, calculate processor fee deductions, and output net clearing totals for banking partner transmission.";
      } else if (text.toLowerCase().includes("reconcil")) {
        reply = "Reconciliation scans compare the sum of all historical ledger entry lines against the active cached balance column of every account, surfacing any variance as an audit discrepancy.";
      }

      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      setLoading(false);
    }, 300);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 h-7 rounded px-2.5 text-xs font-mono font-semibold shadow-sm border border-border bg-card text-foreground hover:bg-muted gap-1.5 cursor-pointer"
      >
        <Terminal className="h-3 w-3 text-foreground" />
        <span className="text-[11px]">Ops Assistant</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-foreground/15 backdrop-blur-2xs transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-3.5 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted border border-border flex items-center justify-center text-foreground font-mono text-xs">
              <Terminal className="h-3 w-3" />
            </div>
            <div>
              <p className="text-xs font-bold font-mono text-foreground">FinOps Terminal &amp; Reference</p>
              <p className="text-[9px] text-muted-foreground font-mono">Platform Documentation Engine</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs custom-scrollbar">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div
                key={index}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded px-3 py-2 text-xs ${
                    isUser
                      ? "bg-foreground text-background font-mono font-medium"
                      : "bg-muted/30 text-foreground border border-border font-sans leading-relaxed"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded border border-border/40 bg-muted/20 w-fit font-mono">
              <Loader2 className="h-3 w-3 animate-spin text-foreground" />
              <span>Querying policy invariants...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestion prompt pills */}
        <div className="border-t border-border bg-muted/10 p-3 space-y-1">
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground font-mono">
            Suggested Policy Queries
          </p>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => ask(s)}
                className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-card hover:bg-muted text-foreground transition-colors text-left truncate max-w-full cursor-pointer"
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
            placeholder="Query platform policies, double-entry rules..."
            className="flex-1 text-xs h-8 font-mono"
            disabled={loading}
          />
          <Button type="submit" size="sm" disabled={loading || !input.trim()} className="bg-foreground hover:bg-foreground/90 text-background font-bold h-8 px-3">
            <Send className="h-3 w-3" />
          </Button>
        </form>
      </aside>
    </>
  );
};
