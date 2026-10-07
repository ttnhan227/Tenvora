import { useRef, useState } from "react";
import { isAiConsentDeclined } from "@/lib/aiConsent";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiAssistantService, AiActionProposalResponse } from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";
import { contextFromPath } from "./assistantContext";

interface AiQuickRecordBarProps {
  currency?: string;
  onRecordSuccess?: () => void;
}

export function AiQuickRecordBar({ onRecordSuccess }: AiQuickRecordBarProps) {
  const { isVietnamese } = useLanguage();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<AiActionProposalResponse | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const decisionInFlight = useRef(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uiContext = contextFromPath(location.pathname, location.search);

  const prepare = async (value?: string) => {
    const source = (value ?? text).trim();
    if (!source || isWorking) return;
    setIsWorking(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProposal(null);
    const response = await aiAssistantService.proposeAction(source, uiContext);
    if (response.success && response.data) setProposal(response.data);
    else if (!isAiConsentDeclined(response)) setErrorMessage(response.message || (isVietnamese ? "Không thể chuẩn bị thao tác." : "Could not prepare that action."));
    setIsWorking(false);
  };

  const decide = async (confirmed: boolean) => {
    if (!proposal?.actionId || isWorking || decisionInFlight.current) {
      if (!confirmed && !isWorking) setProposal(null);
      return;
    }
    decisionInFlight.current = true;
    setIsWorking(true);
    setErrorMessage(null);
    try {
      const response = await aiAssistantService.confirmAction(proposal.actionId, confirmed);
      if (response.success && response.data) {
        if (confirmed) {
          setSuccessMessage(response.data.message);
          setText("");
          await queryClient.invalidateQueries();
          onRecordSuccess?.();
        }
        setProposal(null);
      } else {
        setErrorMessage(response.message || (isVietnamese ? "Không thể hoàn tất thao tác." : "Could not complete the action."));
      }
    } finally {
      decisionInFlight.current = false;
      setIsWorking(false);
    }
  };

  const samples = isVietnamese
    ? ["Anh Nam vừa trả 2 triệu", "Chi 500k tiền vận chuyển hôm nay", "Bán cho chị Lan 5kg gạo giá 125k"]
    : ["Nam just paid 2 million", "Record 500k for transport today", "Sold Lan 5kg of rice for 125k"];

  return (
    <section className="rounded-2xl border-2 border-primary/25 bg-linear-to-r from-card via-card to-primary/5 p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
        <div>
          <h2 className="font-bold">{isVietnamese ? "Nói với Tenvora" : "Tell Tenvora"}</h2>
          <p className="text-xs text-muted-foreground">{isVietnamese ? "Tenvora sẽ kiểm tra dữ liệu và cho bạn xem trước khi ghi sổ." : "Tenvora checks your data and shows a preview before recording anything."}</p>
        </div>
      </div>

      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void prepare(); }}>
        <Input value={text} onChange={(event) => setText(event.target.value)} placeholder={isVietnamese ? "Ví dụ: anh Nam vừa trả 2 triệu" : "Example: Nam just paid 2 million"} disabled={isWorking} className="h-11" />
        <Button type="submit" disabled={!text.trim() || isWorking} className="h-11 gap-2">
          {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="hidden sm:inline">{isVietnamese ? "Kiểm tra" : "Review"}</span>
        </Button>
      </form>

      {!proposal && !successMessage && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {samples.map((sample) => <button key={sample} type="button" onClick={() => { setText(sample); void prepare(sample); }} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">{sample}</button>)}
        </div>
      )}

      {proposal && (
        <div className={`mt-4 rounded-xl border p-4 ${proposal.requiresConfirmation ? "border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/20" : "bg-secondary/40"}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{proposal.summary}</p>
              {Object.keys(proposal.details).length > 0 && (
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {Object.entries(proposal.details).filter(([, value]) => value).map(([label, value]) => (
                    <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd></div>
                  ))}
                </dl>
              )}
              {proposal.candidates && proposal.candidates.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {proposal.candidates.map((item) => <button key={item.id} type="button" disabled={isWorking} onClick={() => void prepare(`${text} — ${item.label}`)} className="rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-50">{item.label}</button>)}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isWorking} onClick={() => void decide(false)}><X className="h-4 w-4" />{isVietnamese ? "Hủy" : "Cancel"}</Button>
            {proposal.requiresConfirmation && proposal.actionId && (
              <Button type="button" disabled={isWorking} onClick={() => void decide(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isVietnamese ? "Xác nhận ghi sổ" : "Confirm and record"}
              </Button>
            )}
          </div>
        </div>
      )}

      {successMessage && <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4" /><span>{successMessage}</span></div>}
      {errorMessage && <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4" /><span>{errorMessage}</span></div>}
    </section>
  );
}
