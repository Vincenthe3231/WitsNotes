"use client";

import { useCallback, useRef } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { Card } from "@/lib/api/schemas";

const SNAP = 8;
function snap(v: number) {
  return Math.round(v / SNAP) * SNAP;
}

export function useCardDrag(
  card: Card,
  onMoveEnd: (x: number, y: number) => void,
  onGroupMoveEnd?: (draggedId: string, dx: number, dy: number) => void
) {
  const viewport = useCanvasStore((s) => s.viewport);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);
  const setDragging = useCanvasStore((s) => s.setDragging);

  const dragStart = useRef<{ clientX: number; clientY: number; cardX: number; cardY: number } | null>(null);
  const isGroupDrag = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const selectedIds = useCanvasStore.getState().selectedIds;
      isGroupDrag.current = selectedIds.has(card.id) && selectedIds.size > 1;
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
      const snappedDx = snap(dx);
      const snappedDy = snap(dy);
      const newX = snap(dragStart.current.cardX + dx);
      const newY = snap(dragStart.current.cardY + dy);
      dragStart.current = null;
      setDragging(null);

      if (isGroupDrag.current && onGroupMoveEnd) {
        onGroupMoveEnd(card.id, snappedDx, snappedDy);
      } else {
        onMoveEnd(newX, newY);
      }
    },
    [card.id, onMoveEnd, onGroupMoveEnd, setDragging, viewport.scale]
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
