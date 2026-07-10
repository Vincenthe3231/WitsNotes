"use client";

import { useRef, useState, useEffect } from "react";
import { useCanvasPointer } from "./useCanvasPointer";
import { CanvasLayer } from "./CanvasLayer";
import { Board, Card } from "@/lib/api/schemas";
import { CardPalette } from "@/features/cards/CardPalette";
import { GroupToolbar } from "./GroupToolbar";
import { useCanvasDropImport } from "./useCanvasDropImport";
import { useCanvasPaste } from "./useCanvasPaste";
import { useMarqueeSelect } from "./useMarqueeSelect";
import { useCanvasKeyboard } from "./useCanvasKeyboard";
import { ShortcutsModal } from "@/components/ui/ShortcutsModal";
import { useBoardDoc } from "@/lib/collab/useBoardDoc";
import { BoardDocContext } from "@/lib/collab/BoardDocContext";
import { PresenceLayer } from "@/features/canvas/PresenceLayer";
import { useCanvasStore } from "@/stores/canvasStore";

interface Props {
  cards: Card[];
  boardId: string;
  board?: Board | null;
}

export function InfiniteCanvas({ cards, boardId, board }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  const boardDoc = useBoardDoc(boardId, board);
  const setMode = useCanvasStore((s) => s.setMode);

  // Reset canvas store when board changes — prevents card leak across boards
  useEffect(() => {
    const s = useCanvasStore.getState();
    s.setLocalCards([]);
    s.clearSelection();
    s.setMarquee(null);
  }, [boardId]);

  // Viewer-role members get forced into read mode
  useEffect(() => {
    if (boardDoc.isReadOnlyMember) {
      setMode("read");
    }
  }, [boardDoc.isReadOnlyMember, setMode]);

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
    <BoardDocContext.Provider value={boardDoc}>
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
        {/* Presence cursors (z=20, between cards z=10 and toolbars z=30) */}
        {boardDoc.isCollab && <PresenceLayer boardId={boardId} containerRef={containerRef} />}
      </div>

      {/* Group selection toolbar */}
      <GroupToolbar boardId={boardId} cards={cards} />

      {/* Floating card creation palette — always renders; collapses in read mode */}
      <CardPalette boardId={boardId} />

      {/* Shortcuts cheatsheet */}
      {showCheatsheet && <ShortcutsModal onClose={() => setShowCheatsheet(false)} />}
    </div>
    </BoardDocContext.Provider>
  );
}
