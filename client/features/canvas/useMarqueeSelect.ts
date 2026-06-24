"use client";

import { useCallback, useRef } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { Card } from "@/lib/api/schemas";
import { screenToCanvas } from "@/lib/canvas/coords";

export function aabbIntersects(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function useMarqueeSelect(cards: Card[]) {
  const viewport = useCanvasStore((s) => s.viewport);
  const setSelection = useCanvasStore((s) => s.setSelection);
  const setMarquee = useCanvasStore((s) => s.setMarquee);
  const mode = useCanvasStore((s) => s.mode);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const curRef = useRef<{ x: number; y: number } | null>(null);
  const activeRef = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): boolean => {
      if (!e.shiftKey || mode === "read") return false;
      const pos = screenToCanvas(e.clientX, e.clientY, viewport);
      startRef.current = pos;
      curRef.current = pos;
      activeRef.current = true;
      setMarquee({ x: pos.x, y: pos.y, w: 0, h: 0 });
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      return true;
    },
    [viewport, setMarquee, mode]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!activeRef.current || !startRef.current) return;
      const pos = screenToCanvas(e.clientX, e.clientY, viewport);
      curRef.current = pos;
      const x = Math.min(startRef.current.x, pos.x);
      const y = Math.min(startRef.current.y, pos.y);
      const w = Math.abs(pos.x - startRef.current.x);
      const h = Math.abs(pos.y - startRef.current.y);
      setMarquee({ x, y, w, h });
    },
    [viewport, setMarquee]
  );

  const onPointerUp = useCallback(() => {
    if (!activeRef.current || !startRef.current || !curRef.current) return;
    const x = Math.min(startRef.current.x, curRef.current.x);
    const y = Math.min(startRef.current.y, curRef.current.y);
    const w = Math.abs(curRef.current.x - startRef.current.x);
    const h = Math.abs(curRef.current.y - startRef.current.y);
    const hit = cards
      .filter((c) => aabbIntersects(x, y, w, h, c.x, c.y, c.w, c.h))
      .map((c) => c.id);
    setSelection(hit);
    setMarquee(null);
    startRef.current = null;
    curRef.current = null;
    activeRef.current = false;
  }, [cards, setSelection, setMarquee]);

  const isActive = () => activeRef.current;

  return { onPointerDown, onPointerMove, onPointerUp, isActive };
}
