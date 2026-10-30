import { toast } from "sonner";
import { aiAssistantService } from "@/services/aiService";
import type { QueryClient } from "@tanstack/react-query";

export interface ToastWithUndoOptions {
  message: string;
  actionId: string;
  onUndoSuccess?: () => void;
  t: (key: string, paramsOrFallback?: any, fallback?: string) => string;
  queryClient?: QueryClient;
  duration?: number;
}

export function showToastWithUndo({
  message,
  actionId,
  onUndoSuccess,
  t,
  queryClient,
  duration = 15000,
}: ToastWithUndoOptions) {
  const undoLabel = t("common.undo", undefined, "Undo");

  toast.success(message, {
    duration,
    action: {
      label: undoLabel,
      onClick: async () => {
        try {
          const res = await aiAssistantService.undoAction(actionId);
          if (res.success) {
            toast.info(res.data?.message || res.message || t("agent.action_undone", undefined, "Action undone."));
            if (queryClient) {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["sales"] }),
                queryClient.invalidateQueries({ queryKey: ["purchases"] }),
                queryClient.invalidateQueries({ queryKey: ["expenses"] }),
                queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
                queryClient.invalidateQueries({ queryKey: ["attention"] }),
                queryClient.invalidateQueries({ queryKey: ["customers"] }),
                queryClient.invalidateQueries({ queryKey: ["products"] }),
                queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
                queryClient.invalidateQueries({ queryKey: ["review-queue"] }),
                queryClient.invalidateQueries({ queryKey: ["review-queue-count"] }),
              ]);
            }
            onUndoSuccess?.();
          } else {
            toast.error(res.message || t("error.undo_failed", undefined, "Failed to undo action."));
          }
        } catch {
          toast.error(t("error.undo_failed", undefined, "Failed to undo action."));
        }
      },
    },
  });
}
