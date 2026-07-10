"use client";

import { useRef, useMemo, useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { Card } from "@/lib/api/schemas";
import { CardShell } from "@/features/cards/CardShell";
import { useBoardDocContext } from "@/lib/collab/BoardDocContext";
import { useYDocCards } from "@/lib/collab/useYDocCards";

const VIEWPORT_MARGIN = 200;

interface Props {
  cards: Card[];
  boardId: string;
}

export function cullCards(
  merged: Card[],
  viewport: { x: number; y: number; scale: number },
  vw: number,
  vh: number,
  margin = VIEWPORT_MARGIN
) {
  const left   = (-viewport.x - margin) / viewport.scale;
  const top    = (-viewport.y - margin) / viewport.scale;
  const right  = (vw - viewport.x + margin) / viewport.scale;
  const bottom = (vh - viewport.y + margin) / viewport.scale;
  return merged.filter(
    (c) => c.x + c.w >= left && c.x <= right && c.y + c.h >= top && c.y <= bottom
  );
}

export function CanvasLayer({ cards: restCards, boardId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useCanvasStore((s) => s.viewport);
  const localCards = useCanvasStore((s) => s.localCards);
  const marquee = useCanvasStore((s) => s.marquee);
  const upsertLocalCards = useCanvasStore((s) => s.upsertLocalCards);

  const { isCollab, ydoc } = useBoardDocContext();
  const ydocCards = useYDocCards(ydoc);

  // On shared boards read from Y.Doc; on single-user boards use REST cards + localCards
  const cards = isCollab ? ydocCards : restCards;

  // Seed localCards with server cards so group-drag snapshot has positions for all selected cards.
  // Only adds cards missing from the map — never overwrites optimistic updates.
  useEffect(() => {
    if (isCollab) return; // Y.Doc is source of truth; no need to seed localCards
    const { localCards: current } = useCanvasStore.getState();
    const unseen = cards.filter((c) => !current.has(c.id));
    if (unseen.length > 0) upsertLocalCards(unseen);
  }, [cards, upsertLocalCards, isCollab]);

  const merged = useMemo(() => {
    if (isCollab) return cards; // Y.Doc already has merged state
    const map = new Map(cards.map((c) => [c.id, localCards.get(c.id) ?? c]));
    for (const [id, card] of localCards.entries()) {
      if (!map.has(id)) map.set(id, card);
    }
    return Array.from(map.values());
  }, [cards, localCards, isCollab]);

  const visible = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
    const vh = typeof window !== "undefined" ? window.innerHeight : 900;
    return cullCards(merged, viewport, vw, vh);
  }, [merged, viewport]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" aria-label="Canvas">
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {visible.map((card) => (
          <CardShell key={card.id} card={card} boardId={boardId} />
        ))}

        {/* Marquee overlay rect */}
        {marquee && marquee.w > 4 && marquee.h > 4 && (
          <div
            style={{
              position: "absolute",
              left: marquee.x,
              top: marquee.y,
              width: marquee.w,
              height: marquee.h,
              border: "1.5px solid var(--color-primary)",
              background: "rgba(var(--color-primary-rgb, 99,102,241), 0.08)",
              borderRadius: 4,
              pointerEvents: "none",
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
