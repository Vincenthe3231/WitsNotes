"use client";

import { useCallback, useRef, useState } from "react";
import { useUpdateCard } from "@/lib/api/hooks";
import { NotebookTab } from "@/lib/api/schemas";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Payload = { tabs: NotebookTab[]; style?: Record<string, unknown> };

export function useNotebookSave(cardId: string, boardId: string) {
  const { mutate: updateCard } = useUpdateCard(boardId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Payload | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const doSave = useCallback(
    (tabs: NotebookTab[], style?: Record<string, unknown>) => {
      const isEncrypted = style?.encrypted;
      const content_text = isEncrypted ? "" : tabs
        .map((t) =>
          (t.blocks as { content?: { type: string; text: string }[] }[])
            .flatMap((b) => b.content ?? [])
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join(" ")
        )
        .join("\n");

      const content = isEncrypted
        ? { ciphertext: style?.ciphertext }
        : { tabs };

      updateCard(
        {
          id: cardId,
          input: {
            content: content as Record<string, unknown>,
            content_text,
            ...(style ? { style } : {}),
          },
        },
        {
          onSuccess: () => {
            setStatus("saved");
            if (hideTimer.current) clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setStatus("idle"), 2000);
          },
          onError: () => setStatus("error"),
        }
      );
    },
    [cardId, updateCard]
  );

  const save = useCallback(
    (tabs: NotebookTab[], style?: Record<string, unknown>) => {
      pendingRef.current = { tabs, style };
      if (timer.current) clearTimeout(timer.current);
      setStatus("saving");
      timer.current = setTimeout(() => {
        const payload = pendingRef.current;
        pendingRef.current = null;
        timer.current = null;
        if (payload) doSave(payload.tabs, payload.style);
      }, 2000);
    },
    [doSave]
  );

  const flush = useCallback(() => {
    if (!timer.current || !pendingRef.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    const payload = pendingRef.current;
    pendingRef.current = null;
    doSave(payload.tabs, payload.style);
  }, [doSave]);

  return { save, flush, status };
}
