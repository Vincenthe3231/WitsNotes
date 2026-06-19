"use client";

import { useCallback, useRef } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { Card } from "@/lib/api/schemas";

const SNAP = 8;
function snap(v: number) {
  return Math.round(v / SNAP) * SNAP;
}

export function useCardDrag(card: Card, onMoveEnd: (x: number, y: number) => void) {
  const viewport = useCanvasStore((s) => s.viewport);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);
  const setDragging = useCanvasStore((s) => s.setDragging);

  const dragStart = useRef<{ clientX: number; clientY: number; cardX: number; cardY: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      dragStart.current = { clientX: e.clientX, clientY: e.clientY, cardX: card.x, cardY: card.y };
      setDragging(card.id);
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [card.id, card.x, card.y, setDragging]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStart.current) return;
      const dx = (e.clientX - dragStart.current.clientX) / viewport.scale;
      const dy = (e.clientY - dragStart.current.clientY) / viewport.scale;
      const newX = snap(dragStart.current.cardX + dx);
      const newY = snap(dragStart.current.cardY + dy);
      upsertLocalCard({ ...card, x: newX, y: newY });
    },
    [card, upsertLocalCard, viewport.scale]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStart.current) return;
      const dx = (e.clientX - dragStart.current.clientX) / viewport.scale;
      const dy = (e.clientY - dragStart.current.clientY) / viewport.scale;
      const newX = snap(dragStart.current.cardX + dx);
      const newY = snap(dragStart.current.cardY + dy);
      dragStart.current = null;
      setDragging(null);
      onMoveEnd(newX, newY);
    },
    [onMoveEnd, setDragging, viewport.scale]
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
