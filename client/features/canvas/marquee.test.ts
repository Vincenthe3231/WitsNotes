import { describe, it, expect } from "vitest";
import { aabbIntersects } from "./useMarqueeSelect";

describe("aabbIntersects", () => {
  it("returns true for overlapping rects", () => {
    expect(aabbIntersects(0, 0, 100, 100, 50, 50, 100, 100)).toBe(true);
  });

  it("returns false for non-overlapping (right)", () => {
    expect(aabbIntersects(0, 0, 100, 100, 200, 0, 100, 100)).toBe(false);
  });

  it("returns false for non-overlapping (below)", () => {
    expect(aabbIntersects(0, 0, 100, 100, 0, 200, 100, 100)).toBe(false);
  });

  it("returns false for touching edges only (strict)", () => {
    // b starts exactly where a ends — our formula uses strict < so this is false
    expect(aabbIntersects(0, 0, 100, 100, 100, 0, 100, 100)).toBe(false);
  });

  it("returns true for fully contained rect", () => {
    expect(aabbIntersects(0, 0, 200, 200, 50, 50, 50, 50)).toBe(true);
  });

  it("zero-size marquee inside card area intersects (ax<bx+bw && ax+0>bx)", () => {
    // ax=50 < bx+bw=100 ✓, ax+aw=50 > bx=0 ✓ → true
    expect(aabbIntersects(50, 50, 0, 0, 0, 0, 100, 100)).toBe(true);
  });
});
