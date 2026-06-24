"use client";

import { Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useConfirmStore } from "@/stores/confirmStore";
import { useDeleteCard, useCreateCard, useUpdateCard } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";

interface Props {
  boardId: string;
  cards: Card[];
}

export function GroupToolbar({ boardId, cards }: Props) {
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const mode = useCanvasStore((s) => s.mode);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const removeLocalCard = useCanvasStore((s) => s.removeLocalCard);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);
  const confirm = useConfirmStore((s) => s.confirm);
  const { mutate: deleteCard } = useDeleteCard();
  const { mutate: createCard } = useCreateCard();
  const { mutate: updateCard } = useUpdateCard();

  if (selectedIds.size === 0 || mode === "read") return null;

  const selected = cards.filter((c) => selectedIds.has(c.id));

  async function handleDelete() {
    const confirmed = await confirm({
      title: "Delete cards",
      message: `Delete ${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.`,
      danger: true,
    });
    if (!confirmed) return;

    selected.forEach((c) => {
      removeLocalCard(c.id);
      deleteCard({ boardId, cardId: c.id });
    });
    clearSelection();
  }

  function handleDuplicate() {
    selected.forEach((c) => {
      createCard({
        boardId,
        type: c.type,
        x: c.x + 16,
        y: c.y + 16,
        w: c.w,
        h: c.h,
        z: c.z,
        rotation: c.rotation,
        title: c.title ?? undefined,
        content: c.content ?? undefined,
        content_text: c.content_text ?? undefined,
      });
    });
  }

  function handleBringToFront() {
    const allZ = cards.map((c) => c.z);
    const maxZ = allZ.length ? Math.max(...allZ) : 10;
    selected.forEach((c) => {
      const updated = { ...c, z: maxZ + 1 };
      upsertLocalCard(updated);
      updateCard({ boardId, id: c.id, input: { z: maxZ + 1 } });
    });
  }

  function handleSendToBack() {
    const allZ = cards.map((c) => c.z);
    const minZ = allZ.length ? Math.min(...allZ) : 0;
    selected.forEach((c) => {
      const updated = { ...c, z: minZ - 1 };
      upsertLocalCard(updated);
      updateCard({ boardId, id: c.id, input: { z: minZ - 1 } });
    });
  }

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-xl z-30"
      style={{
        backdropFilter: "blur(16px)",
        background: "var(--color-surface-glass)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
      aria-label={`${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""} selected`}
    >
      <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginRight: 6, whiteSpace: "nowrap" }}>
        {selectedIds.size} selected
      </span>

      {[
        { icon: <Trash2 size={14} />,  label: "Delete",         fn: handleDelete },
        { icon: <Copy size={14} />,    label: "Duplicate",      fn: handleDuplicate },
        { icon: <ArrowUp size={14} />, label: "Bring to front", fn: handleBringToFront },
        { icon: <ArrowDown size={14} />, label: "Send to back", fn: handleSendToBack },
      ].map(({ icon, label, fn }) => (
        <button
          key={label}
          onClick={fn}
          title={label}
          aria-label={label}
          style={{
            padding: "6px 8px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            color: "var(--color-text-muted)",
            minHeight: 44,
            minWidth: 44,
            justifyContent: "center",
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
