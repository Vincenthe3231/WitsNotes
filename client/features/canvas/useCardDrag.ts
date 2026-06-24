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
  onGroupMoveEnd?: () => void
) {
  const viewport = useCanvasStore((s) => s.viewport);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);
  const upsertLocalCards = useCanvasStore((s) => s.upsertLocalCards);
  const setDragging = useCanvasStore((s) => s.setDragging);

  const dragStart = useRef<{ clientX: number; clientY: number; cardX: number; cardY: number } | null>(null);
  const isGroupDrag = useRef(false);
  // Snapshot of all selected cards' positions at drag start — prevents drift when updating live
  const groupStartPositions = useRef<Map<string, { x: number; y: number }> | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const { selectedIds, localCards } = useCanvasStore.getState();
      isGroupDrag.current = selectedIds.has(card.id) && selectedIds.size > 1;
      dragStart.current = { clientX: e.clientX, clientY: e.clientY, cardX: card.x, cardY: card.y };

      if (isGroupDrag.current) {
        const positions = new Map<string, { x: number; y: number }>();
        selectedIds.forEach((id) => {
          const c = localCards.get(id);
          if (c) positions.set(id, { x: c.x, y: c.y });
        });
        groupStartPositions.current = positions;
      }

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

      if (isGroupDrag.current && groupStartPositions.current) {
        // Batch all selected cards into one store update — single Map copy, single React render
        const { localCards } = useCanvasStore.getState();
        const updates: Card[] = [];
        groupStartPositions.current.forEach(({ x: startX, y: startY }, id) => {
          const c = localCards.get(id);
          if (c) updates.push({ ...c, x: snap(startX + dx), y: snap(startY + dy) });
        });
        upsertLocalCards(updates);
      } else {
        upsertLocalCard({ ...card, x: snap(dragStart.current.cardX + dx), y: snap(dragStart.current.cardY + dy) });
      }
    },
    [card, upsertLocalCard, upsertLocalCards, viewport.scale]
  );

  const cancelDrag = useCallback(() => {
    dragStart.current = null;
    groupStartPositions.current = null;
    isGroupDrag.current = false;
    setDragging(null);
  }, [setDragging]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStart.current) return;
      const dx = (e.clientX - dragStart.current.clientX) / viewport.scale;
      const dy = (e.clientY - dragStart.current.clientY) / viewport.scale;
      const newX = snap(dragStart.current.cardX + dx);
      const newY = snap(dragStart.current.cardY + dy);
      const wasGroup = isGroupDrag.current;
      dragStart.current = null;
      groupStartPositions.current = null;
      isGroupDrag.current = false;
      setDragging(null);

      if (wasGroup && onGroupMoveEnd) {
        // localCards already has final positions from live updates — caller just persists them
        onGroupMoveEnd();
      } else {
        onMoveEnd(newX, newY);
      }
    },
    [onMoveEnd, onGroupMoveEnd, setDragging, viewport.scale]
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancelDrag };
}
