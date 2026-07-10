import { describe, it, expect } from "vitest";
import { arrangeMoodboardGrid } from "./moodboard";
import { Card } from "@/lib/api/schemas";

function makeCard(id: string): Card {
  return {
    id,
    board_id: "board-1",
    created_by: 1,
    type: "image",
    title: null,
    x: 999,
    y: 999,
    w: 320,
    h: 200,
    z: 10,
    rotation: 0,
    style: null,
    content: null,
    content_text: null,
    due_at: null,
    remind_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("arrangeMoodboardGrid", () => {
  it("places cards row-major with default 4 columns", () => {
    const cards = ["a", "b", "c", "d", "e"].map(makeCard);
    const positions = arrangeMoodboardGrid(cards);

    expect(positions[0]).toMatchObject({ id: "a", x: 0, y: 0 });
    expect(positions[3]).toMatchObject({ id: "d", x: 3 * (220 + 12), y: 0 });
    expect(positions[4]).toMatchObject({ id: "e", x: 0, y: 220 + 12 }); // wraps to row 2
  });

  it("respects a custom column count", () => {
    const cards = ["a", "b", "c"].map(makeCard);
    const positions = arrangeMoodboardGrid(cards, { columns: 2 });
    expect(positions[2]).toMatchObject({ x: 0, y: 220 + 12 });
  });

  it("respects custom cell size, gutter, and origin", () => {
    const cards = ["a", "b"].map(makeCard);
    const positions = arrangeMoodboardGrid(cards, {
      columns: 2, cellWidth: 100, cellHeight: 100, gutter: 10, originX: 50, originY: 50,
    });
    expect(positions[0]).toMatchObject({ x: 50, y: 50 });
    expect(positions[1]).toMatchObject({ x: 50 + 110, y: 50 });
  });

  it("returns an empty array for no cards", () => {
    expect(arrangeMoodboardGrid([])).toEqual([]);
  });
});
