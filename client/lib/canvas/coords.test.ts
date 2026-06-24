import { describe, it, expect } from "vitest";
import { screenToCanvas } from "./coords";

describe("screenToCanvas", () => {
  it("identity at scale 1 and zero offset", () => {
    const vp = { x: 0, y: 0, scale: 1 };
    expect(screenToCanvas(200, 300, vp)).toEqual({ x: 200, y: 300 });
  });

  it("applies viewport offset", () => {
    const vp = { x: 50, y: 100, scale: 1 };
    expect(screenToCanvas(200, 300, vp)).toEqual({ x: 150, y: 200 });
  });

  it("applies scale correctly", () => {
    const vp = { x: 0, y: 0, scale: 2 };
    expect(screenToCanvas(200, 300, vp)).toEqual({ x: 100, y: 150 });
  });

  it("matches CardPalette spawnCard formula", () => {
    // CardPalette originally: x = (vw/2 - viewport.x) / viewport.scale
    // canvasCenter uses screenToCanvas(vw/2, vh/2, vp)
    const vp = { x: -100, y: -200, scale: 1.5 };
    const vw = 1440;
    const vh = 900;
    const expected = {
      x: (vw / 2 - vp.x) / vp.scale,
      y: (vh / 2 - vp.y) / vp.scale,
    };
    const got = screenToCanvas(vw / 2, vh / 2, vp);
    expect(got.x).toBeCloseTo(expected.x);
    expect(got.y).toBeCloseTo(expected.y);
  });
});
