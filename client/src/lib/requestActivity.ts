export const REQUEST_ACTIVITY_EVENT = "verispend:request-activity";

export function reportRequestActivity(delta: 1 | -1) {
  window.dispatchEvent(new CustomEvent(REQUEST_ACTIVITY_EVENT, { detail: delta }));
}
