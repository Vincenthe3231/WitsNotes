"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { onlineManager, useIsMutating, useMutationState } from "@tanstack/react-query";
import { WifiOff, RefreshCw, Check } from "lucide-react";

function subscribeOnline(cb: () => void): () => void {
  return onlineManager.subscribe(() => cb());
}

export function SyncStatus() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => onlineManager.isOnline(),
    () => true,
  );

  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    function onConflict() {
      setConflict(true);
      setTimeout(() => setConflict(false), 4000);
    }
    window.addEventListener("card:conflict", onConflict);
    return () => window.removeEventListener("card:conflict", onConflict);
  }, []);

  const isMutating = useIsMutating();
  const paused = useMutationState({
    filters: { status: "paused" },
    select: () => 1,
  }).length;

  if (conflict) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
        style={{ background: "var(--color-warning, #b45309)", color: "#fff" }}
      >
        <RefreshCw size={12} />
        Conflict — refreshed
      </div>
    );
  }

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
        style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
      >
        <WifiOff size={12} />
        Offline{paused > 0 ? ` · ${paused} pending` : ""}
      </div>
    );
  }

  if (isMutating > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
        style={{ color: "var(--color-text-muted)" }}
      >
        <RefreshCw size={12} className="animate-spin" />
        Syncing…
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
      style={{ color: "var(--color-text-muted)", opacity: 0.6 }}
    >
      <Check size={12} />
      Synced
    </div>
  );
}
