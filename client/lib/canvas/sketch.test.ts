import { describe, it, expect } from "vitest";
import { strokeToOutline, hitTestStroke, eraseAt, Stroke } from "./sketch";

function stroke(overrides: Partial<Stroke> = {}): Stroke {
  return {
    id: "s1",
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ],
    color: "#000000",
    size: 4,
    ...overrides,
  };
}

describe("strokeToOutline", () => {
  it("produces a non-empty outline for a multi-point stroke", () => {
    const outline = strokeToOutline(stroke());
    expect(outline.length).toBeGreaterThan(0);
    // Each outline entry is an [x, y] pair
    for (const point of outline) {
      expect(point).toHaveLength(2);
      expect(typeof point[0]).toBe("number");
      expect(typeof point[1]).toBe("number");
    }
  });

  it("produces an outline for a single-point stroke (a dot/tap)", () => {
    const outline = strokeToOutline(stroke({ points: [{ x: 5, y: 5 }] }));
    expect(outline.length).toBeGreaterThan(0);
  });
});

describe("hitTestStroke", () => {
  it("hits when point lies directly on a segment", () => {
    expect(hitTestStroke(stroke(), { x: 5, y: 0 }, 2)).toBe(true);
  });

  it("hits when point is within stroke thickness + radius of a segment", () => {
    // size 4 -> half-thickness 2; radius 3 -> threshold 5
    expect(hitTestStroke(stroke({ size: 4 }), { x: 5, y: 4 }, 3)).toBe(true);
  });

  it("misses when point is far from every segment", () => {
    expect(hitTestStroke(stroke(), { x: 5, y: 100 }, 2)).toBe(false);
  });

  it("misses when point is just past the threshold", () => {
    // size 2 -> half-thickness 1; radius 1 -> threshold 2; point at distance 2.5
    expect(hitTestStroke(stroke({ size: 2 }), { x: 5, y: 2.5 }, 1)).toBe(false);
  });

  it("handles a single-point stroke as a dot hit-test", () => {
    const dot = stroke({ points: [{ x: 10, y: 10 }], size: 4 });
    expect(hitTestStroke(dot, { x: 11, y: 11 }, 2)).toBe(true);
    expect(hitTestStroke(dot, { x: 100, y: 100 }, 2)).toBe(false);
  });

  it("hits beyond a segment's endpoint clamps to the nearest endpoint, not the infinite line", () => {
    // Point is past the (20,0) endpoint, off to the side — should NOT hit via
    // the infinite-line extension of the last segment.
    expect(hitTestStroke(stroke(), { x: 30, y: 0.5 }, 1)).toBe(false);
  });
});

describe("eraseAt", () => {
  it("removes only strokes touched by the eraser point", () => {
    const near = stroke({ id: "near", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] });
    const far = stroke({ id: "far", points: [{ x: 500, y: 500 }, { x: 510, y: 500 }] });

    const result = eraseAt([near, far], { x: 5, y: 0 }, 2);

    expect(result.map((s) => s.id)).toEqual(["far"]);
  });

  it("returns the same list unchanged when nothing is hit", () => {
    const strokes = [stroke({ id: "a" }), stroke({ id: "b", points: [{ x: 900, y: 900 }] })];
    const result = eraseAt(strokes, { x: -1000, y: -1000 }, 1);
    expect(result).toHaveLength(2);
  });

  it("erases multiple strokes in one pass if the eraser overlaps both", () => {
    const a = stroke({ id: "a", points: [{ x: 0, y: 0 }, { x: 5, y: 0 }] });
    const b = stroke({ id: "b", points: [{ x: 5, y: 5 }, { x: 10, y: 5 }] });
    const result = eraseAt([a, b], { x: 5, y: 2.5 }, 5);
    expect(result).toHaveLength(0);
  });
});
