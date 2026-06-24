import { describe, it, expect, beforeEach } from "vitest";
import { useCanvasStore } from "./canvasStore";

function reset() {
  useCanvasStore.setState({
    viewport: { x: 0, y: 0, scale: 1 },
    selectedIds: new Set(),
    draggingId: null,
    localCards: new Map(),
    marquee: null,
  });
}

describe("canvasStore", () => {
  beforeEach(reset);

  describe("zoomTo", () => {
    it("clamps to MIN_SCALE", () => {
      useCanvasStore.getState().zoomTo(0.01, 0, 0);
      expect(useCanvasStore.getState().viewport.scale).toBe(0.1);
    });

    it("clamps to MAX_SCALE", () => {
      useCanvasStore.getState().zoomTo(999, 0, 0);
      expect(useCanvasStore.getState().viewport.scale).toBe(4);
    });

    it("adjusts origin correctly", () => {
      useCanvasStore.getState().zoomTo(2, 100, 100);
      const { x, y, scale } = useCanvasStore.getState().viewport;
      expect(scale).toBe(2);
      // origin at 100,100 should remain pinned: x = 100 - (100-0)*2 = -100
      expect(x).toBe(-100);
      expect(y).toBe(-100);
    });
  });

  describe("panBy", () => {
    it("adds dx/dy to viewport", () => {
      useCanvasStore.getState().panBy(50, -30);
      const { x, y } = useCanvasStore.getState().viewport;
      expect(x).toBe(50);
      expect(y).toBe(-30);
    });
  });

  describe("selectCard", () => {
    it("selects single card and clears previous", () => {
      useCanvasStore.getState().selectCard("a");
      useCanvasStore.getState().selectCard("b");
      expect(useCanvasStore.getState().selectedIds.has("b")).toBe(true);
      expect(useCanvasStore.getState().selectedIds.has("a")).toBe(false);
    });

    it("toggles in multi mode", () => {
      useCanvasStore.getState().selectCard("a", true);
      useCanvasStore.getState().selectCard("a", true);
      expect(useCanvasStore.getState().selectedIds.has("a")).toBe(false);
    });

    it("adds in multi mode without clearing", () => {
      useCanvasStore.getState().selectCard("a", true);
      useCanvasStore.getState().selectCard("b", true);
      expect(useCanvasStore.getState().selectedIds.size).toBe(2);
    });
  });

  describe("setSelection", () => {
    it("replaces selection with given ids", () => {
      useCanvasStore.getState().selectCard("old", true);
      useCanvasStore.getState().setSelection(["x", "y", "z"]);
      const { selectedIds } = useCanvasStore.getState();
      expect(selectedIds.size).toBe(3);
      expect(selectedIds.has("old")).toBe(false);
      expect(selectedIds.has("y")).toBe(true);
    });
  });
});
