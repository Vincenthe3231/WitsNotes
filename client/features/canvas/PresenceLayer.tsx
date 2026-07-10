"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useBoardDocContext } from "@/lib/collab/BoardDocContext";
import { useCanvasStore } from "@/stores/canvasStore";
import { useAuthStore } from "@/stores/authStore";

function userColor(userId: number | string): string {
  const colors = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981",
    "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
  ];
  const hash = String(userId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

interface AwarenessUser {
  userId: number;
  name: string;
  cursor: { x: number; y: number } | null;
  selectedIds: string[];
}

interface Props {
  boardId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const THROTTLE_MS = 50; // ~20 updates/s

export function PresenceLayer({ containerRef }: Props) {
  const { getProvider, isCollab } = useBoardDocContext();
  const viewport = useCanvasStore((s) => s.viewport);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const user = useAuthStore((s) => s.user);

  const [peers, setPeers] = useState<AwarenessUser[]>([]);
  const lastEmit = useRef(0);
  const viewportRef = useRef(viewport);
  const selectedIdsRef = useRef(selectedIds);

  // Keep refs current without re-registering listeners on every change
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const emitCursor = useCallback((e: PointerEvent) => {
    if (!isCollab || !user) return;
    const now = Date.now();
    if (now - lastEmit.current < THROTTLE_MS) return;
    lastEmit.current = now;

    const provider = getProvider();
    if (!provider?.awareness) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const vp = viewportRef.current;
    const cx = (e.clientX - rect.left - vp.x) / vp.scale;
    const cy = (e.clientY - rect.top - vp.y) / vp.scale;

    provider.awareness.setLocalStateField("user", {
      userId: user.id,
      name: user.name,
      cursor: { x: cx, y: cy },
      selectedIds: Array.from(selectedIdsRef.current),
    });
  }, [isCollab, user, getProvider, containerRef]);

  const clearCursor = useCallback(() => {
    const provider = getProvider();
    if (!provider?.awareness || !user) return;
    provider.awareness.setLocalStateField("user", {
      userId: user.id,
      name: user.name,
      cursor: null,
      selectedIds: [],
    });
  }, [getProvider, user]);

  useEffect(() => {
    if (!isCollab) return;

    const container = containerRef.current;
    container?.addEventListener("pointermove", emitCursor);
    container?.addEventListener("pointerleave", clearCursor);

    const provider = getProvider();
    if (!provider?.awareness) return;

    const onChange = () => {
      const states = provider.awareness.getStates();
      const myClientId = provider.awareness.clientID;
      const next: AwarenessUser[] = [];

      states.forEach((state, clientId) => {
        if (clientId === myClientId) return;
        const u = state.user as AwarenessUser | undefined;
        if (u?.userId != null) next.push(u);
      });

      setPeers(next);
    };

    provider.awareness.on("change", onChange);

    return () => {
      container?.removeEventListener("pointermove", emitCursor);
      container?.removeEventListener("pointerleave", clearCursor);
      provider.awareness.off("change", onChange);
    };
  }, [isCollab, containerRef, emitCursor, clearCursor, getProvider]);

  if (!isCollab || peers.length === 0) return null;

  const prefersReduced = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20, overflow: "hidden" }}
    >
      {peers.map((peer) => {
        if (!peer.cursor) return null;

        const sx = peer.cursor.x * viewport.scale + viewport.x;
        const sy = peer.cursor.y * viewport.scale + viewport.y;
        const color = userColor(peer.userId);

        return (
          <div
            key={peer.userId}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate(${sx}px, ${sy}px)`,
              transition: prefersReduced ? "none" : "transform 80ms linear",
              willChange: "transform",
              pointerEvents: "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: "block" }}>
              <path
                d="M2 2 L14 8 L8 10 L6 16 Z"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            <div
              style={{
                position: "absolute",
                left: 14,
                top: 2,
                background: color,
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                userSelect: "none",
                opacity: 0.95,
                boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
              }}
            >
              {peer.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
