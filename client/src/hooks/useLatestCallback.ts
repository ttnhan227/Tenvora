import { useCallback, useLayoutEffect, useRef } from "react";

// Keep subscriptions stable while letting async event handlers see current state.
export function useLatestCallback<T extends (...args: any[]) => any>(callback: T): T {
  const latest = useRef(callback);
  useLayoutEffect(() => { latest.current = callback; }, [callback]);
  return useCallback((...args: Parameters<T>) => latest.current(...args), []) as T;
}
