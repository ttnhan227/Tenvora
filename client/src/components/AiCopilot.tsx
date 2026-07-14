import { FormEvent, useEffect, useRef, useState } from "react";
import { aiService, AiCopilotMessage } from "@/services/aiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Database, Loader2, Send, Sparkles, X } from "lucide-react";

export const AiCopilot = ({ companyName }: { companyName?: string }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(["What should I do first?", "Summarize this workspace", "What needs attention?"]);
  const [messages, setMessages] = useState<AiCopilotMessage[]>([{ role: "assistant", content: `Welcome to ${companyName || "your workspace"}. I'm Veri, your spend-control copilot. I can explain setup, expenses, policies, risk flags, budgets, and approval work using your authorized workspace data.` }]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: question.trim() }];
    setMessages(next); setInput(""); setLoading(true);
    const result = await aiService.askCopilot(question.trim(), next.slice(-6));
    setMessages(current => [...current, { role: "assistant", content: result.success && result.data ? result.data.answer : result.error || "I could not answer that." }]);
    if (result.data?.suggestedActions) setSuggestions(result.data.suggestedActions);
    setLoading(false);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void ask(input); };

  return <>
    <Button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-40 h-14 rounded-full px-5 shadow-2xl"><Sparkles className="mr-2 h-5 w-5"/>Ask Veri</Button>
    {open && <div className="fixed inset-0 z-[70] bg-foreground/15 backdrop-blur-sm" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
      <div className="flex items-center justify-between border-b border-border p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></div><div><p className="font-bold">Veri AI Copilot</p><p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Database className="h-3 w-3"/>Grounded in authorized workspace data</p></div></div><Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4"/></Button></div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">{messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>{message.content}</div></div>)}{loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Reading workspace context…</div>}<div ref={endRef}/></div>
      <div className="border-t border-border p-4"><div className="mb-3 flex gap-2 overflow-x-auto pb-1">{suggestions.map(suggestion => <button key={suggestion} onClick={() => void ask(suggestion)} className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold hover:border-primary/30 hover:text-primary">{suggestion}</button>)}</div><form onSubmit={submit} className="flex gap-2"><Input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about setup, spend, risk, or policy…" maxLength={2000}/><Button type="submit" size="icon" disabled={loading || !input.trim()}><Send className="h-4 w-4"/></Button></form><p className="mt-2 text-center text-[9px] text-muted-foreground">Read-only copilot · Answers respect tenant and role permissions</p></div>
    </aside>
  </>;
};
