import { useEffect, useMemo, useState } from "react";
import { Bot, Database, RefreshCw, Sparkles } from "lucide-react";
import apiClient from "@/services/apiClient";
import { AssistantMessageContent } from "@/components/assistant/AssistantMessageContent";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceAiInsightProps {
  title: string;
  prompt: string;
  className?: string;
}

interface InsightResult {
  response: string;
  source?: string;
}

const inFlightInsights = new Map<string, Promise<InsightResult>>();

function promptHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readCachedInsight(key: string) {
  try {
    const cached = sessionStorage.getItem(key);
    return cached ? JSON.parse(cached) as InsightResult : null;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

function requestInsight(key: string, prompt: string) {
  const cached = readCachedInsight(key);
  if (cached?.response) return Promise.resolve(cached);

  const existingRequest = inFlightInsights.get(key);
  if (existingRequest) return existingRequest;

  const request = apiClient.post("/ai/query", { prompt })
    .then((response) => {
      const payload = (response.data?.data ?? response.data) as InsightResult;
      if (!payload?.response) throw new Error("AI summary response was empty");
      sessionStorage.setItem(key, JSON.stringify(payload));
      return payload;
    })
    .finally(() => inFlightInsights.delete(key));

  inFlightInsights.set(key, request);
  return request;
}

export function WorkspaceAiInsight({ title, prompt, className = "" }: WorkspaceAiInsightProps) {
  const { user } = useAuth();
  const cacheKey = useMemo(
    () => `tenvora:ai-summary:${user?.id || user?.email || "workspace"}:${promptHash(prompt)}`,
    [prompt, user?.email, user?.id],
  );
  const [result, setResult] = useState<InsightResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadInsight() {
      setLoading(true);
      setError("");
      try {
        const insight = await requestInsight(cacheKey, prompt);
        if (!cancelled) setResult(insight);
      } catch (requestError) {
        console.error("Workspace AI summary failed", requestError);
        if (!cancelled) {
          setResult(null);
          setError("The workspace summary is temporarily unavailable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInsight();
    return () => {
      cancelled = true;
    };
  }, [attempt, cacheKey, prompt]);

  return (
    <section className={`rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card p-5 shadow-xs ${className}`.trim()} aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">{title}</h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-primary">
                <Sparkles size={10} /> AI summary
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
              <Database size={11} /> Workspace database context · cached for this session
            </p>
          </div>
        </div>
        {result && <span className="rounded-full border border-border bg-background/70 px-2 py-1 text-[10px] font-semibold text-muted-foreground">Tenvora AI</span>}
      </div>

      <div className="mt-4 border-t border-border/60 pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw size={13} className="animate-spin text-primary" /> Reviewing your current workspace records…
          </div>
        ) : error ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw size={12} className="mr-1.5" /> Try again
            </Button>
          </div>
        ) : result ? (
          <AssistantMessageContent text={result.response} />
        ) : null}
      </div>

      <p className="mt-4 border-t border-border/60 pt-3 text-[10px] leading-relaxed text-muted-foreground">
        Why: this summary is generated from tenant-scoped invoices, clients, recorded accounts, and tax settings. It cannot see your real bank balance or unrecorded expenses.
      </p>
    </section>
  );
}
