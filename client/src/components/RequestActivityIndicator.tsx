import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { REQUEST_ACTIVITY_EVENT } from "@/lib/requestActivity";

export function RequestActivityIndicator() {
  const [activeRequests, setActiveRequests] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const handleActivity = (event: Event) => {
      const delta = (event as CustomEvent<number>).detail;
      setActiveRequests((current) => Math.max(0, current + delta));
    };
    window.addEventListener(REQUEST_ACTIVITY_EVENT, handleActivity);
    return () => window.removeEventListener(REQUEST_ACTIVITY_EVENT, handleActivity);
  }, []);

  useEffect(() => {
    if (!activeRequests) {
      setShowMessage(false);
      return;
    }
    const timer = window.setTimeout(() => setShowMessage(true), 700);
    return () => window.clearTimeout(timer);
  }, [activeRequests]);

  if (!activeRequests) return null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/15" aria-hidden="true">
        <div className="h-full w-1/3 animate-[request-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      {showMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[100] flex max-w-xs items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-foreground shadow-2xl">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          <div>
            <p className="text-xs font-bold">Working on your request…</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">The free server can take a little longer. You can keep this page open.</p>
          </div>
        </div>
      )}
    </>
  );
}
