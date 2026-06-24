"use client";

import { useRef, useState } from "react";
import { useCanvasPointer } from "./useCanvasPointer";
import { CanvasLayer } from "./CanvasLayer";
import { Card } from "@/lib/api/schemas";
import { CardPalette } from "@/features/cards/CardPalette";
import { GroupToolbar } from "./GroupToolbar";
import { useCanvasDropImport } from "./useCanvasDropImport";
import { useCanvasPaste } from "./useCanvasPaste";
import { useMarqueeSelect } from "./useMarqueeSelect";
import { useCanvasKeyboard } from "./useCanvasKeyboard";
import { ShortcutsModal } from "@/components/ui/ShortcutsModal";

interface Props {
  cards: Card[];
  boardId: string;
}

export function InfiniteCanvas({ cards, boardId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  const marqueeHandlers = useMarqueeSelect(cards);
  const { onPointerDown, onPointerMove, onPointerUp } = useCanvasPointer(containerRef, marqueeHandlers);
  const { onDragOver, onDrop } = useCanvasDropImport(boardId);
  useCanvasPaste(boardId);

  useCanvasKeyboard({
    boardId,
    cards,
    onOpenCheatsheet: () => setShowCheatsheet(true),
  });

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
        onDragOver={onDragOver}
        onDrop={onDrop}
        aria-label="Infinite canvas — drag to pan, scroll to zoom, Shift+drag to select, drop files to import"
      >
        <CanvasLayer cards={cards} boardId={boardId} />
      </div>

      {/* Group selection toolbar */}
      <GroupToolbar boardId={boardId} cards={cards} />

      {/* Floating card creation palette — always renders; collapses in read mode */}
      <CardPalette boardId={boardId} />

      {/* Shortcuts cheatsheet */}
      {showCheatsheet && <ShortcutsModal onClose={() => setShowCheatsheet(false)} />}
    </div>
  );
}
