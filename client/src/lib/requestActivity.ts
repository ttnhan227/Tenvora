export const REQUEST_ACTIVITY_EVENT = "tenvora:request-activity";

export function reportRequestActivity(delta: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<number>(REQUEST_ACTIVITY_EVENT, {
      detail: delta,
    })
  );
}
