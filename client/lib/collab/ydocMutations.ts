import * as Y from "yjs";
import type { Card } from "@/lib/api/schemas";

type CardPatch = Partial<Pick<Card, "x" | "y" | "w" | "h" | "z" | "rotation" | "title" | "content" | "content_text" | "due_at" | "remind_at">>;

/** Merge a partial card update into the Y.Doc cards map. */
export function ydocUpdateCard(ydoc: Y.Doc, cardId: string, patch: CardPatch): void {
  const map = ydoc.getMap<Y.Map<unknown>>("cards");
  ydoc.transact(() => {
    let cardMap = map.get(cardId);
    if (!cardMap) {
      cardMap = new Y.Map<unknown>();
      map.set(cardId, cardMap);
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) cardMap.set(k, v);
    }
    cardMap.set("updated_at", new Date().toISOString());
  });
}

/** Insert a new card into the Y.Doc cards map. */
export function ydocInsertCard(ydoc: Y.Doc, card: Card): void {
  const map = ydoc.getMap<Y.Map<unknown>>("cards");
  ydoc.transact(() => {
    const cardMap = new Y.Map<unknown>();
    for (const [k, v] of Object.entries(card)) {
      if (v !== undefined && v !== null) cardMap.set(k, v);
    }
    map.set(card.id, cardMap);
  });
}

/** Remove a card from the Y.Doc cards map. */
export function ydocDeleteCard(ydoc: Y.Doc, cardId: string): void {
  const map = ydoc.getMap<Y.Map<unknown>>("cards");
  ydoc.transact(() => {
    map.delete(cardId);
  });
}
