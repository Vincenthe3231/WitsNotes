"use client";

import { useRef } from "react";
import { useCanvasPointer } from "./useCanvasPointer";
import { CanvasLayer } from "./CanvasLayer";
import { Card } from "@/lib/api/schemas";
import { CardPalette } from "@/features/cards/CardPalette";

interface Props {
  cards: Card[];
  boardId: string;
}

export function InfiniteCanvas({ cards, boardId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { onPointerDown, onPointerMove, onPointerUp } =
    useCanvasPointer(containerRef);

  return (
    <div className="relative flex-1 overflow-hidden" style={{ touchAction: "none" }}>
      {/* Canvas interaction surface */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ cursor: "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label="Infinite canvas — drag to pan, scroll to zoom"
      >
        <CanvasLayer cards={cards} boardId={boardId} />
      </div>

      {/* Floating card creation palette */}
      <CardPalette boardId={boardId} />
    </div>
  );
}
