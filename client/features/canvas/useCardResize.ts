"use client";

import { useCallback, useRef } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { Card } from "@/lib/api/schemas";

const SNAP = 8;
const MIN_SIZE = 80;

function snap(v: number) {
  return Math.round(v / SNAP) * SNAP;
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface ResizeStart {
  clientX: number;
  clientY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  handle: ResizeHandle;
}

export function useCardResize(card: Card, onResizeEnd: (x: number, y: number, w: number, h: number) => void) {
  const viewport = useCanvasStore((s) => s.viewport);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);

  const start = useRef<ResizeStart | null>(null);

  function compute(e: { clientX: number; clientY: number }) {
    if (!start.current) return null;
    const { clientX, clientY, x, y, w, h, handle } = start.current;
    const dx = (e.clientX - clientX) / viewport.scale;
    const dy = (e.clientY - clientY) / viewport.scale;

    let newX = x, newY = y, newW = w, newH = h;

    if (handle.includes("e")) newW = Math.max(MIN_SIZE, snap(w + dx));
    if (handle.includes("s")) newH = Math.max(MIN_SIZE, snap(h + dy));
    if (handle.includes("w")) {
      const clamped = Math.max(MIN_SIZE, snap(w - dx));
      newX = snap(x + (w - clamped));
      newW = clamped;
    }
    if (handle.includes("n")) {
      const clamped = Math.max(MIN_SIZE, snap(h - dy));
      newY = snap(y + (h - clamped));
      newH = clamped;
    }

    return { x: newX, y: newY, w: newW, h: newH };
  }

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();
      start.current = { clientX: e.clientX, clientY: e.clientY, x: card.x, y: card.y, w: card.w, h: card.h, handle };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [card.x, card.y, card.w, card.h]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const dims = compute(e);
      if (!dims) return;
      upsertLocalCard({ ...card, ...dims });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card, upsertLocalCard, viewport.scale]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const dims = compute(e);
      start.current = null;
      if (!dims) return;
      onResizeEnd(dims.x, dims.y, dims.w, dims.h);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onResizeEnd, viewport.scale]
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
