"use client";

import { useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useCreateCard, useUpdateCard } from "@/lib/api/hooks";
import { uploadCardAttachment } from "@/lib/api/uploadCardAttachment";
import { screenToCanvas } from "@/lib/canvas/coords";
import { mimeToCardType } from "@/features/cards/CardPalette";
import { Card } from "@/lib/api/schemas";

export function useCanvasDropImport(boardId: string) {
  const viewport = useCanvasStore((s) => s.viewport);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);
  const mode = useCanvasStore((s) => s.mode);
  const { mutateAsync: createCardAsync } = useCreateCard();
  const { mutate: updateCard } = useUpdateCard();

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (mode === "read") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, [mode]);

  const handleFile = useCallback(
    async (file: File, canvasX: number, canvasY: number) => {
      if (mode === "read") return;
      const type = mimeToCardType(file.type);
      const w = 320;
      const h = type === "audio" || type === "file" ? 180 : 240;
      const x = Math.round(canvasX - w / 2);
      const y = Math.round(canvasY - h / 2);

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

      await uploadCardAttachment({ boardId, card, file, upsertLocalCard, updateCard: (vars) => updateCard(vars) });
    },
    [boardId, mode, createCardAsync, updateCard, upsertLocalCard]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (mode === "read") return;
      e.preventDefault();
      const pos = screenToCanvas(e.clientX, e.clientY, viewport);
      Array.from(e.dataTransfer.files).forEach((file) => handleFile(file, pos.x, pos.y));
    },
    [handleFile, mode, viewport]
  );

  return { onDragOver, onDrop };
}
