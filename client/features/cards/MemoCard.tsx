"use client";

import { Card } from "@/lib/api/schemas";
import { NotionEditor } from "@/features/editor/NotionEditorDynamic";

interface Props {
  card: Card;
  boardId: string;
}

export function MemoCard({ card, boardId }: Props) {
  return (
    <div
      className="glass-card h-full flex flex-col overflow-hidden"
      style={{ borderRadius: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <NotionEditor card={card} boardId={boardId} />
    </div>
  );
}
