"use client";

import { useRef, useMemo } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { Card } from "@/lib/api/schemas";
import { CardShell } from "@/features/cards/CardShell";

const VIEWPORT_MARGIN = 200; // px extra culling buffer

interface Props {
  cards: Card[];
  boardId: string;
}

export function CanvasLayer({ cards, boardId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useCanvasStore((s) => s.viewport);
  const localCards = useCanvasStore((s) => s.localCards);

  // Merge: server cards + local overrides + optimistic-only cards not yet in server response
  const merged = useMemo(() => {
    const map = new Map(cards.map((c) => [c.id, localCards.get(c.id) ?? c]));
    for (const [id, card] of localCards.entries()) {
      if (!map.has(id)) map.set(id, card);
    }
    return Array.from(map.values());
  }, [cards, localCards]);

  // Viewport culling — only render cards within visible bounds + margin
  const visible = useMemo(() => {
    const vw = (typeof window !== "undefined" ? window.innerWidth : 1440);
    const vh = (typeof window !== "undefined" ? window.innerHeight : 900);
    const left   = (-viewport.x - VIEWPORT_MARGIN) / viewport.scale;
    const top    = (-viewport.y - VIEWPORT_MARGIN) / viewport.scale;
    const right  = (vw - viewport.x + VIEWPORT_MARGIN) / viewport.scale;
    const bottom = (vh - viewport.y + VIEWPORT_MARGIN) / viewport.scale;

    return merged.filter(
      (c) => c.x + c.w >= left && c.x <= right && c.y + c.h >= top && c.y <= bottom
    );
  }, [merged, viewport]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      aria-label="Canvas"
    >
      {/* Single GPU-composited transform wrapper */}
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
      </div>
    </div>
  );
}
