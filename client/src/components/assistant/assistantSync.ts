export type AiConversationSyncReason = "selected" | "changed" | "new" | "deleted";

export interface AiConversationSyncEvent {
  activeConversationId: string | null;
  reason: AiConversationSyncReason;
  source: string;
}

const eventName = "tenvora:ai-conversation-sync";
const storageKey = "tenvora_active_ai_conversation_id";

function readInitialState(): { id: string | null; hasSynced: boolean } {
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem(storageKey);
      if (stored === "__NEW__") {
        return { id: null, hasSynced: true };
      }
      if (stored) {
        return { id: stored, hasSynced: true };
      }
    }
  } catch {
    // sessionStorage might be restricted or throw in strict sandbox
  }
  return { id: null, hasSynced: false };
}

function persistState(id: string | null, hasSynced: boolean) {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (!hasSynced) {
      sessionStorage.removeItem(storageKey);
    } else if (id === null) {
      sessionStorage.setItem(storageKey, "__NEW__");
    } else {
      sessionStorage.setItem(storageKey, id);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

const initial = readInitialState();
let activeConversationId: string | null = initial.id;
let hasSynchronizedSelection = initial.hasSynced;

export function getSyncedAiConversationId(): string | null | undefined {
  return hasSynchronizedSelection ? activeConversationId : undefined;
}

export function setSyncedAiConversationId(id: string | null) {
  hasSynchronizedSelection = true;
  activeConversationId = id;
  persistState(id, true);
}

export function resetSyncedAiConversationState() {
  hasSynchronizedSelection = false;
  activeConversationId = null;
  persistState(null, false);
}

export function publishAiConversationSync(event: AiConversationSyncEvent) {
  hasSynchronizedSelection = true;
  activeConversationId = event.activeConversationId;
  persistState(event.activeConversationId, true);
  window.dispatchEvent(new CustomEvent<AiConversationSyncEvent>(eventName, { detail: event }));
}

export function subscribeToAiConversationSync(listener: (event: AiConversationSyncEvent) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<AiConversationSyncEvent>).detail);
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
