"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useConfirmStore } from "@/stores/confirmStore";
import { useDeleteCard, useCreateCard } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    (el as HTMLElement).isContentEditable
  );
}

interface Opts {
  boardId: string;
  cards: Card[];
  onOpenCheatsheet: () => void;
}

export function useCanvasKeyboard({ boardId, cards, onOpenCheatsheet }: Opts) {
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const setSelection = useCanvasStore((s) => s.setSelection);
  const removeLocalCard = useCanvasStore((s) => s.removeLocalCard);
  const mode = useCanvasStore((s) => s.mode);
  const confirm = useConfirmStore((s) => s.confirm);
  const { mutate: deleteCard } = useDeleteCard();
  const { mutate: createCard } = useCreateCard();

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      // ? → cheatsheet (always allowed)
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        onOpenCheatsheet();
        return;
      }

      // Esc → clear selection (always allowed)
      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      // Cmd/Ctrl+A → select all (read mode blocks)
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        if (mode === "read") return;
        e.preventDefault();
        setSelection(cards.map((c) => c.id));
        return;
      }

      // Delete/Backspace → delete selected (read mode blocks)
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        if (mode === "read") return;
        e.preventDefault();
        const confirmed = await confirm({
          title: "Delete cards",
          message: `Delete ${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.`,
          danger: true,
        });
        if (!confirmed) return;

        selectedIds.forEach((id) => {
          removeLocalCard(id);
          deleteCard({ boardId, cardId: id });
        });
        clearSelection();
        return;
      }

      // Cmd/Ctrl+D → duplicate selected (edit mode only)
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedIds.size > 0 && mode === "edit") {
        e.preventDefault();
        const toClone = cards.filter((c) => selectedIds.has(c.id));
        toClone.forEach((c) => {
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
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [boardId, cards, selectedIds, mode, clearSelection, setSelection, removeLocalCard, deleteCard, createCard, confirm, onOpenCheatsheet]);
}
