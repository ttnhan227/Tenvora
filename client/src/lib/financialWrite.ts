import apiClient from "@/services/apiClient";
import type { AxiosResponse } from "axios";

const storageKey = "tenvora_pending_writes";
const active = new Map<string, Promise<AxiosResponse>>();

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

// Store only a digest and request ID, never the submitted financial details.
export async function financialWrite(path: string, input: unknown): Promise<AxiosResponse> {
  const user = JSON.parse(localStorage.getItem("user") ?? "null");
  const scope = user ? `${user.tenantId}:${user.id ?? user.userId ?? user.email}` : localStorage.getItem("refreshToken") ?? "local-session";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([scope, path, canonical(input)])));
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const inFlight = active.get(fingerprint);
  if (inFlight) return inFlight;

  const request = (async () => {
    const pending: Record<string, string> = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    const id = pending[fingerprint] ?? crypto.randomUUID();
    pending[fingerprint] = id;
    // Fail before the network request if safe retry persistence is unavailable.
    localStorage.setItem(storageKey, JSON.stringify(pending));
    const currentUser = JSON.parse(localStorage.getItem("user") ?? "null");
    const currentScope = currentUser ? `${currentUser.tenantId}:${currentUser.id ?? currentUser.userId ?? currentUser.email}` : localStorage.getItem("refreshToken") ?? "local-session";
    if (currentScope !== scope) throw new Error("Your account changed. Open the form again.");
    const forget = () => {
      const current = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      delete current[fingerprint];
      localStorage.setItem(storageKey, JSON.stringify(current));
    };
    try {
      const response = await apiClient.post(path, input, { headers: { "Idempotency-Key": id } });
      try { forget(); } catch { /* A confirmed success must remain a success. */ }
      return response;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        try { forget(); } catch { /* Preserve the original validation error. */ }
        throw error;
      }
      throw Object.assign(new Error("Could not confirm whether this was saved. Check your records; retrying the same details uses the original request ID."), { code: "write_uncertain" });
    }
  })();
  active.set(fingerprint, request);
  try { return await request; } finally { active.delete(fingerprint); }
}
