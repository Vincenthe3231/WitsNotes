"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
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
  const { mutate: deleteCard } = useDeleteCard();
  const { mutate: createCard } = useCreateCard();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      // ? → cheatsheet
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        onOpenCheatsheet();
        return;
      }

      // Esc → clear selection
      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      // Cmd/Ctrl+A → select all
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        setSelection(cards.map((c) => c.id));
        return;
      }

      // Delete/Backspace → delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        e.preventDefault();
        selectedIds.forEach((id) => {
          removeLocalCard(id);
          deleteCard({ boardId, cardId: id });
        });
        clearSelection();
        return;
      }

      // Cmd/Ctrl+D → duplicate selected
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedIds.size > 0) {
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
  }, [boardId, cards, selectedIds, clearSelection, setSelection, removeLocalCard, deleteCard, createCard, onOpenCheatsheet]);
}
