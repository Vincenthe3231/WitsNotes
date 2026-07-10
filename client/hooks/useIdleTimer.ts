"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel"] as const;

/**
 * Calls `onIdle` after `timeoutMs` of no user activity (pointer/keyboard/
 * scroll). The timer resets on any activity. Used for vault auto-relock.
 */
export function useIdleTimer(timeoutMs: number, onIdle: () => void, enabled = true) {
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    reset();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset));
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs, enabled]);
}
