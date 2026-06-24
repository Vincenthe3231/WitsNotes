import { describe, it, expect } from "vitest";
import { cullCards } from "./CanvasLayer";
import type { Card } from "@/lib/api/schemas";

function makeCard(id: string, x: number, y: number, w = 100, h = 100): Card {
  return {
    id, board_id: "b1", created_by: 1, type: "note",
    x, y, w, h, z: 1, rotation: 0,
    style: null, content: null, content_text: null,
    due_at: null, remind_at: null,
    created_at: "", updated_at: "",
  };
}

const VP = { x: 0, y: 0, scale: 1 };

describe("cullCards", () => {
  it("includes cards within viewport", () => {
    const cards = [makeCard("a", 100, 100)];
    expect(cullCards(cards, VP, 1440, 900, 0)).toHaveLength(1);
  });

  it("excludes cards entirely to the right", () => {
    const cards = [makeCard("a", 1500, 100)];
    expect(cullCards(cards, VP, 1440, 900, 0)).toHaveLength(0);
  });

  it("excludes cards entirely below", () => {
    const cards = [makeCard("a", 0, 1000)];
    expect(cullCards(cards, VP, 1440, 900, 0)).toHaveLength(0);
  });

  it("includes cards partially in view (right edge)", () => {
    // card at x=1400, w=100, so right edge=1500 > viewport right=1440 but left<right
    const cards = [makeCard("a", 1400, 0, 100, 100)];
    expect(cullCards(cards, VP, 1440, 900, 0)).toHaveLength(1);
  });

  it("margin extends visible area", () => {
    // card just outside with margin=0 is excluded, with margin=200 is included
    const cards = [makeCard("a", 1500, 0)];
    expect(cullCards(cards, VP, 1440, 900, 0)).toHaveLength(0);
    expect(cullCards(cards, VP, 1440, 900, 200)).toHaveLength(1);
  });
});
