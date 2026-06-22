"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Overload 1: useHydrated() → false on server, true after hydration.
 * Overload 2: useHydrated(getClientValue, serverValue) → serverValue on
 * server/first render, getClientValue() on client after hydration — the
 * canonical useSyncExternalStore pattern for any browser-only read.
 *
 * Open/Closed: the SSR-split logic is closed; callers extend it by passing
 * different value factories without modifying this hook.
 */
export function useHydrated(): boolean;
export function useHydrated<T>(getClientValue: () => T, serverValue: T): T;
export function useHydrated<T = boolean>(
  getClientValue?: () => T,
  serverValue?: T,
): boolean | T {
  return useSyncExternalStore(
    emptySubscribe,
    getClientValue ?? (() => true as unknown as T),
    () => (getClientValue !== undefined ? (serverValue as T) : (false as unknown as T)),
  );
}
