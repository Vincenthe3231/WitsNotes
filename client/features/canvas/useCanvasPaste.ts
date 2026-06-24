"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useToastStore } from "@/stores/toastStore";
import { useCreateCard, useUpdateCard } from "@/lib/api/hooks";
import { uploadCardAttachment } from "@/lib/api/uploadCardAttachment";
import { canvasCenter } from "@/lib/canvas/coords";
import { mimeToCardType } from "@/features/cards/CardPalette";
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

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function useCanvasPaste(boardId: string) {
  const viewport = useCanvasStore((s) => s.viewport);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);
  const mode = useCanvasStore((s) => s.mode);
  const { mutateAsync: createCardAsync } = useCreateCard();
  const { mutate: updateCard } = useUpdateCard();
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if (mode === "read") return;
      if (isInputFocused()) return;

      const cb = e.clipboardData;
      if (!cb) return;

      // Image blob
      const files = cb.files;
      if (files.length > 0) {
        const file = files[0];
        const type = mimeToCardType(file.type);
        const w = 320;
        const h = type === "audio" || type === "file" ? 180 : 240;
        const center = canvasCenter(viewport);
        const x = Math.round(center.x - w / 2);
        const y = Math.round(center.y - h / 2);

        let card: Card;
        try {
          card = await createCardAsync({
            boardId, type, x, y, w, h, z: 10, rotation: 0,
            title: file.name,
            content: { status: "uploading", progress: 0, original_name: file.name },
            content_text: file.name,
          });
        } catch {
          return;
        }

        try {
          await uploadCardAttachment({ boardId, card, file, upsertLocalCard, updateCard: (vars) => updateCard(vars) });
          pushToast({ level: "info", message: "Pasted image", ttl: 2000 });
        } catch {
          pushToast({ level: "error", message: "Failed to paste image" });
        }
        return;
      }

      // Text — check if URL or plain text
      const text = cb.getData("text/plain").trim();
      if (!text) return;

      const center = canvasCenter(viewport);
      const x = Math.round(center.x - 160);
      const y = Math.round(center.y - 100);

      if (isValidUrl(text)) {
        // URL → bookmark card
        try {
          await createCardAsync({
            boardId,
            type: "bookmark",
            x, y, w: 320, h: 200, z: 10, rotation: 0,
            content_text: text,
          });
          pushToast({ level: "info", message: "Pasted link", ttl: 2000 });
        } catch {
          pushToast({ level: "error", message: "Failed to paste link" });
        }
      } else {
        // Plain text → memo (note) card
        try {
          await createCardAsync({
            boardId,
            type: "note",
            x, y, w: 320, h: 200, z: 10, rotation: 0,
            content_text: text,
          });
          pushToast({ level: "info", message: "Pasted text", ttl: 2000 });
        } catch {
          pushToast({ level: "error", message: "Failed to paste text" });
        }
      }
    };

    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [boardId, mode, viewport, createCardAsync, updateCard, upsertLocalCard, pushToast]);
}
