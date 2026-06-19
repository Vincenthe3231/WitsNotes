"use client";

import { memo, useCallback, useState } from "react";
import { GripVertical, Trash2, ExternalLink, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUpdateCard, useDeleteCard } from "@/lib/api/hooks";
import { Card, NotebookTab } from "@/lib/api/schemas";
import { flatten } from "@/lib/notebook/tree";
import { useCardDrag } from "@/features/canvas/useCardDrag";
import { useCardResize, ResizeHandle } from "@/features/canvas/useCardResize";
import { NotebookCard } from "./NotebookCard";
import { TodoCard } from "./TodoCard";
import { BookmarkCard } from "./BookmarkCard";
import { LinksListCard } from "./LinksListCard";

interface Props {
  card: Card;
  boardId: string;
}

const CORNER_HANDLES: { handle: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
  { handle: "nw", style: { top: -7, left: -7 },     cursor: "nwse-resize" },
  { handle: "ne", style: { top: -7, right: -7 },    cursor: "nesw-resize" },
  { handle: "se", style: { bottom: -7, right: -7 }, cursor: "nwse-resize" },
  { handle: "sw", style: { bottom: -7, left: -7 },  cursor: "nesw-resize" },
];

function CornerHandle({
  handle, style, cursor, onPointerDown, onPointerMove, onPointerUp,
}: {
  handle: ResizeHandle;
  style: React.CSSProperties;
  cursor: string;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, h: ResizeHandle) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const isRight = handle.includes("e");
  const isBottom = handle.includes("s");
  const len = 10, w = 2;
  const color = "var(--color-primary)";
  return (
    <div
      style={{ position: "absolute", width: 14, height: 14, cursor, zIndex: 20, ...style }}
      onPointerDown={(e) => onPointerDown(e, handle)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div style={{ position: "absolute", width: len, height: w, background: color, top: isBottom ? undefined : 0, bottom: isBottom ? 0 : undefined, left: isRight ? undefined : 0, right: isRight ? 0 : undefined }} />
      <div style={{ position: "absolute", width: w, height: len, background: color, top: isBottom ? undefined : 0, bottom: isBottom ? 0 : undefined, left: isRight ? undefined : 0, right: isRight ? 0 : undefined }} />
    </div>
  );
}

function CardShellInner({ card, boardId }: Props) {
  const router = useRouter();
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const selectCard = useCanvasStore((s) => s.selectCard);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);
  const removeLocalCard = useCanvasStore((s) => s.removeLocalCard);
  const { mutate: updateCard } = useUpdateCard(boardId);
  const { mutate: deleteCard } = useDeleteCard(boardId);

  const isSelected = selectedIds.has(card.id);
  const isNotebook = card.type === "notebook";

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title ?? "");

  const saveTitle = (val: string) => {
    setEditingTitle(false);
    const t = val.trim();
    if (t !== (card.title ?? "")) {
      upsertLocalCard({ ...card, title: t });
      updateCard({ id: card.id, input: { title: t } });
    }
  };

  const handleMoveEnd = useCallback(
    (x: number, y: number) => {
      upsertLocalCard({ ...card, x, y });
      updateCard({ id: card.id, input: { x, y } });
    },
    [card, upsertLocalCard, updateCard]
  );

  const handleResizeEnd = useCallback(
    (x: number, y: number, w: number, h: number) => {
      upsertLocalCard({ ...card, x, y, w, h });
      updateCard({ id: card.id, input: { x, y, w, h } });
    },
    [card, upsertLocalCard, updateCard]
  );

  const { onPointerDown: onDragDown, onPointerMove: onDragMove, onPointerUp: onDragUp } =
    useCardDrag(card, handleMoveEnd);

  const { onPointerDown: onResizeDown, onPointerMove: onResizeMove, onPointerUp: onResizeUp } =
    useCardResize(card, handleResizeEnd);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    selectCard(card.id, e.metaKey || e.shiftKey);
  }

  function openNotebook() {
    router.push(`/board/${boardId}/notebook/${card.id}`);
  }

  const tabs = isNotebook
    ? (card.content as { tabs?: NotebookTab[] } | null)?.tabs
    : undefined;
  const pageCount = tabs ? flatten(tabs).length : 0;
  const encrypted = !!(card.style as { encrypted?: boolean } | null)?.encrypted;

  const displayTitle = isNotebook
    ? (card.title ?? "Notebook")
    : (card.title ?? card.type);

  return (
    <div
      className="absolute"
      style={{
        left: card.x,
        top: card.y,
        width: card.w,
        height: card.h,
        zIndex: card.z,
        transform: card.rotation ? `rotate(${card.rotation}deg)` : undefined,
        boxSizing: "border-box",
      }}
      onClick={handleClick}
      onDoubleClick={isNotebook ? openNotebook : undefined}
    >
      {/* Inner clip — keeps borderRadius + overflow without clipping resize handles */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          outline: isSelected ? "2px solid var(--color-primary)" : "none",
          outlineOffset: 2,
          boxShadow: isSelected
            ? "0 0 0 2px var(--color-primary), 0 8px 32px rgba(0,0,0,0.18)"
            : "0 2px 12px rgba(0,0,0,0.10)",
          transition: "box-shadow 150ms, outline 150ms",
        }}
      >
      {/* Header bar */}
      <div
        style={{
          height: 28,
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: 4,
          background: "var(--glass-bg-light)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--glass-border)",
          userSelect: "none",
        }}
        onPointerDown={onDragDown}
        onPointerMove={onDragMove}
        onPointerUp={onDragUp}
      >
        <GripVertical size={13} style={{ color: "var(--color-text-muted)", opacity: 0.5, flexShrink: 0 }} />

        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={(e) => saveTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(titleDraft); if (e.key === "Escape") setEditingTitle(false); }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ fontSize: 11, flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--color-text)", padding: 0 }}
          />
        ) : (
          <span
            style={{ fontSize: 11, color: "var(--color-text-muted)", opacity: 0.8, textTransform: "capitalize", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setTitleDraft(card.title ?? (isNotebook ? "Notebook" : card.type));
              setEditingTitle(true);
            }}
          >
            {displayTitle}
          </span>
        )}

        {isNotebook && encrypted && (
          <Lock size={11} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        )}
        {isNotebook && tabs && (
          <span style={{ fontSize: 10, background: "var(--color-primary)", color: "var(--color-primary-fg)", borderRadius: 9, padding: "0 5px", lineHeight: "15px", flexShrink: 0 }}>
            {pageCount}
          </span>
        )}
        {isNotebook && (
          <button
            style={{ padding: "2px 4px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", borderRadius: 4, flexShrink: 0 }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); openNotebook(); }}
            title="Open notebook"
          >
            <ExternalLink size={11} style={{ color: "var(--color-text-muted)" }} />
          </button>
        )}

        <button
          style={{ padding: "2px 4px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", borderRadius: 4, flexShrink: 0 }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            removeLocalCard(card.id);
            deleteCard(card.id);
          }}
          title="Delete card"
        >
          <Trash2 size={12} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
        </button>
      </div>

      {/* Card content */}
      <div style={{ height: "calc(100% - 28px)", overflow: "hidden" }}>
        {(card.type === "note" || card.type === "notebook") && <NotebookCard card={card} boardId={boardId} />}
        {(card.type === "todo" || card.type === "task") && <TodoCard card={card} boardId={boardId} />}
        {card.type === "bookmark" && <BookmarkCard card={card} boardId={boardId} />}
        {card.type === "link_list" && <LinksListCard card={card} boardId={boardId} />}
        {!["note", "notebook", "todo", "task", "bookmark", "link_list"].includes(card.type) && (
          <NotebookCard card={card} boardId={boardId} />
        )}
      </div>

      </div>

      {/* Corner-only L-bracket resize handles — outside clip div so overflow:hidden doesn't cut them */}
      {isSelected && CORNER_HANDLES.map(({ handle, style, cursor }) => (
        <CornerHandle
          key={handle}
          handle={handle}
          style={style}
          cursor={cursor}
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
        />
      ))}
    </div>
  );
}

export const CardShell = memo(CardShellInner);
