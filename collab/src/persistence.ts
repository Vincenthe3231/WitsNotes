import * as Y from "yjs";

const laravelUrl  = process.env.LARAVEL_INTERNAL_URL ?? "http://localhost:8000/api/internal";
const internalSecret = process.env.COLLAB_INTERNAL_SECRET ?? "";

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Collab-Secret": internalSecret,
  };
}

export interface CardSnapshot {
  id: string;
  type: string;
  title: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number | null;
  rotation: number | null;
  content: unknown | null;
  content_text: string | null;
  due_at: string | null;
  remind_at: string | null;
  created_by: string | null;
}

/** Load Y.Doc state from Laravel. Returns decoded state bytes or null (seed from cards). */
export async function loadYDoc(boardId: string): Promise<{ state: Uint8Array | null; cards: CardSnapshot[] | null }> {
  const res = await fetch(`${laravelUrl}/boards/${boardId}/ydoc`, {
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(`[collab] loadYDoc ${boardId} failed: ${res.status}`);
  }

  const body = (await res.json()) as { state: string | null; cards: CardSnapshot[] | null };

  if (body.state) {
    const bytes = Buffer.from(body.state, "base64");
    return { state: new Uint8Array(bytes), cards: null };
  }

  return { state: null, cards: body.cards ?? [] };
}

/** Project Y.Doc cards map to a flat CardSnapshot array. */
export function extractCards(doc: Y.Doc): CardSnapshot[] {
  const map = doc.getMap<Y.Map<unknown>>("cards");
  const cards: CardSnapshot[] = [];

  map.forEach((cardMap) => {
    cards.push({
      id:           cardMap.get("id") as string,
      type:         (cardMap.get("type") as string) ?? "sticky",
      title:        (cardMap.get("title") as string | null) ?? null,
      x:            (cardMap.get("x") as number) ?? 0,
      y:            (cardMap.get("y") as number) ?? 0,
      w:            (cardMap.get("w") as number) ?? 200,
      h:            (cardMap.get("h") as number) ?? 150,
      z:            (cardMap.get("z") as number | null) ?? null,
      rotation:     (cardMap.get("rotation") as number | null) ?? null,
      content:      (cardMap.get("content") as unknown | null) ?? null,
      content_text: (cardMap.get("content_text") as string | null) ?? null,
      due_at:       (cardMap.get("due_at") as string | null) ?? null,
      remind_at:    (cardMap.get("remind_at") as string | null) ?? null,
      created_by:   (cardMap.get("created_by") as string | null) ?? null,
    });
  });

  return cards;
}

/** Persist Y.Doc blob + card snapshot to Laravel (debounced by caller). */
export async function storeYDoc(boardId: string, doc: Y.Doc): Promise<void> {
  const state = Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");
  const cards = extractCards(doc);

  const res = await fetch(`${laravelUrl}/boards/${boardId}/ydoc`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ state, cards }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[collab] storeYDoc ${boardId} failed: ${res.status} ${text}`);
  }
}
