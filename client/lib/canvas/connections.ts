import { Card, Connection } from "@/lib/api/schemas";

export function cardCenter(card: Card): { x: number; y: number } {
  return { x: card.x + card.w / 2, y: card.y + card.h / 2 };
}

export interface ResolvedConnection {
  connection: Connection;
  from: Card;
  to: Card;
}

/**
 * Resolves each connection's endpoint cards, dropping any whose card no
 * longer exists (soft-fail per the design spec — a connection to a
 * deleted card is silently omitted, no error surfaced to the user).
 */
export function resolveConnectionEndpoints(
  cards: Card[],
  connections: Connection[]
): ResolvedConnection[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const resolved: ResolvedConnection[] = [];
  for (const connection of connections) {
    const from = byId.get(connection.from_card_id);
    const to = byId.get(connection.to_card_id);
    if (from && to) resolved.push({ connection, from, to });
  }
  return resolved;
}
