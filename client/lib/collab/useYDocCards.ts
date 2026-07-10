"use client";

import { useState, useEffect } from "react";
import * as Y from "yjs";
import type { Card } from "@/lib/api/schemas";

/**
 * Subscribes to the "cards" Y.Map in the Y.Doc and returns a Card[] snapshot.
 * Re-renders whenever the map changes (any card add/move/delete/update).
 */
export function useYDocCards(ydoc: Y.Doc): Card[] {
  const [cards, setCards] = useState<Card[]>(() => extractCards(ydoc));

  useEffect(() => {
    const map = ydoc.getMap<Y.Map<unknown>>("cards");

    const observer = () => {
      setCards(extractCards(ydoc));
    };

    map.observeDeep(observer);
    return () => map.unobserveDeep(observer);
  }, [ydoc]);

  return cards;
}

function extractCards(doc: Y.Doc): Card[] {
  const map = doc.getMap<Y.Map<unknown>>("cards");
  const result: Card[] = [];

  map.forEach((cardMap, id) => {
    result.push({
      id,
      board_id:     (cardMap.get("board_id") as string) ?? "",
      type:         (cardMap.get("type") as Card["type"]) ?? "sticky",
      title:        (cardMap.get("title") as string | null) ?? null,
      x:            (cardMap.get("x") as number) ?? 0,
      y:            (cardMap.get("y") as number) ?? 0,
      w:            (cardMap.get("w") as number) ?? 200,
      h:            (cardMap.get("h") as number) ?? 150,
      z:            (cardMap.get("z") as number) ?? 0,
      rotation:     (cardMap.get("rotation") as number) ?? 0,
      style:        (cardMap.get("style") as Card["style"]) ?? null,
      content:      (cardMap.get("content") as Card["content"]) ?? null,
      content_text: (cardMap.get("content_text") as string | null) ?? null,
      due_at:       (cardMap.get("due_at") as string | null) ?? null,
      remind_at:    (cardMap.get("remind_at") as string | null) ?? null,
      created_by:   (cardMap.get("created_by") as string | null) ?? null,
      created_at:   (cardMap.get("created_at") as string) ?? new Date().toISOString(),
      updated_at:   (cardMap.get("updated_at") as string) ?? new Date().toISOString(),
    });
  });

  return result;
}
