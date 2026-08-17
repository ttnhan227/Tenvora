import React, { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { aiService, AiCopilotMessage } from "@/services/aiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Database, Loader2, Send, X } from "lucide-react";

const suggestions = [
  "What is our expense approval limit?",
  "How are policy exceptions handled?",
  "How does the risk scoring engine calculate scores?",
  "Where can I export audit reports?",
];

const normalizeMarkdown = (content: string) =>
  content
    .replace(/^(\s*)-\s+/gm, "$1* ")
    .replace(/^(\s*\d+)\.\s+/gm, "$1\\. ")
    .replace(/\\n/g, "\n");

export const AiCopilot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiCopilotMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your VeriSpend Copilot. Ask me questions about company expense policies, workflows, or spending intelligence.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
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
    if (!open) {
      setOpen(true);
    }
    void ask(suggestion);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-11 rounded-full px-4 text-xs font-semibold shadow-lg border border-border bg-card text-foreground hover:bg-secondary gap-2 transition-all"
      >
        <Bot className="h-4 w-4 text-primary" />
        <span>Ask Copilot</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-foreground/15 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">VeriSpend Copilot</p>
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Database className="h-3 w-3" />
                Authorized workspace context
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h3 className="mb-2 mt-1 text-base font-bold text-foreground">{children}</h3>
                      ),
                      h2: ({ children }) => (
                        <h3 className="mb-2 mt-3 text-sm font-bold text-foreground">{children}</h3>
                      ),
                      h3: ({ children }) => (
                        <h4 className="mb-1 mt-3 text-sm font-semibold text-foreground">{children}</h4>
                      ),
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => (
                        <ul className="mb-2 ml-4 list-disc space-y-1 marker:text-primary">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-2 ml-5 list-decimal space-y-1 marker:font-bold marker:text-primary">
                          {children}
                        </ol>
                      ),
                      strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                      code: ({ children }) => (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-primary">
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="my-2 border-l-2 border-primary pl-3 text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="my-2 overflow-x-auto">
                          <table className="w-full border-collapse text-xs">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border bg-muted p-2 text-left font-bold">{children}</th>
                      ),
                      td: ({ children }) => <td className="border border-border p-2 align-top">{children}</td>,
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-primary underline underline-offset-2"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {normalizeMarkdown(message.content)}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Reading workspace context…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold hover:border-primary/30 hover:text-primary transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about setup, spend, risk, or policy…"
              maxLength={2000}
              className="bg-card border-border text-xs rounded-lg h-9"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
          <p className="mt-2 text-center text-[9px] text-muted-foreground">
            Read-only copilot · Answers respect tenant and role permissions
          </p>
        </div>
      </aside>
    </>
  );
};
