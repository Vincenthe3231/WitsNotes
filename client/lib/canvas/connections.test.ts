import { describe, it, expect } from "vitest";
import { cardCenter, resolveConnectionEndpoints } from "./connections";
import { Card, Connection } from "@/lib/api/schemas";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    board_id: "board-1",
    created_by: 1,
    type: "note",
    title: null,
    x: 0,
    y: 0,
    w: 100,
    h: 50,
    z: 10,
    rotation: 0,
    style: null,
    content: null,
    content_text: null,
    due_at: null,
    remind_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: "conn-1",
    board_id: "board-1",
    from_card_id: "a",
    to_card_id: "b",
    kind: "arrow",
    style: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("cardCenter", () => {
  it("returns the midpoint of the card's bounding box", () => {
    expect(cardCenter(makeCard({ x: 100, y: 200, w: 40, h: 60 }))).toEqual({ x: 120, y: 230 });
  });
});

describe("resolveConnectionEndpoints", () => {
  it("resolves both endpoint cards for a valid connection", () => {
    const a = makeCard({ id: "a" });
    const b = makeCard({ id: "b" });
    const conn = makeConnection({ from_card_id: "a", to_card_id: "b" });

    const resolved = resolveConnectionEndpoints([a, b], [conn]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].from.id).toBe("a");
    expect(resolved[0].to.id).toBe("b");
    expect(resolved[0].connection.id).toBe(conn.id);
  });

  it("drops a connection whose 'to' card was deleted (soft-fail, no error)", () => {
    const a = makeCard({ id: "a" });
    const conn = makeConnection({ from_card_id: "a", to_card_id: "deleted-card" });

    expect(resolveConnectionEndpoints([a], [conn])).toHaveLength(0);
  });

  it("drops a connection whose 'from' card was deleted", () => {
    const b = makeCard({ id: "b" });
    const conn = makeConnection({ from_card_id: "deleted-card", to_card_id: "b" });

    expect(resolveConnectionEndpoints([b], [conn])).toHaveLength(0);
  });

  it("resolves multiple connections independently", () => {
    const a = makeCard({ id: "a" });
    const b = makeCard({ id: "b" });
    const c = makeCard({ id: "c" });
    const conns = [
      makeConnection({ id: "1", from_card_id: "a", to_card_id: "b" }),
      makeConnection({ id: "2", from_card_id: "b", to_card_id: "c" }),
    ];

    expect(resolveConnectionEndpoints([a, b, c], conns)).toHaveLength(2);
  });
});
