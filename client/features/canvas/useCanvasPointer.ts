"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCanvasStore } from "@/stores/canvasStore";

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

interface MarqueeHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => boolean;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  isActive: () => boolean;
}

export function useCanvasPointer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  marquee?: MarqueeHandlers
) {
  const panBy = useCanvasStore((s) => s.panBy);
  const zoomTo = useCanvasStore((s) => s.zoomTo);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const wheelRafId = useRef<number | null>(null);
  const panRafId = useRef<number | null>(null);
  const pendingPan = useRef({ dx: 0, dy: 0 });

  // Wheel zoom — rAF throttled, non-passive to call preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelRafId.current) return;
      const rect = el.getBoundingClientRect();
      const originX = e.clientX - rect.left;
      const originY = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      wheelRafId.current = requestAnimationFrame(() => {
        wheelRafId.current = null;
        const { viewport, zoomTo: zoom } = useCanvasStore.getState();
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * (1 + delta)));
        zoom(newScale, originX, originY);
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      if (wheelRafId.current) cancelAnimationFrame(wheelRafId.current);
    };
  }, [containerRef, zoomTo]);

  // Pan — cards call stopPropagation so this only fires on empty canvas
  // Shift+drag → marquee (no pan, no clearSelection)
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (marquee && e.shiftKey) {
        marquee.onPointerDown(e);
        return;
      }
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      if (containerRef.current) containerRef.current.dataset.panning = "true";
      clearSelection();
    },
    [clearSelection, containerRef, marquee]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (marquee?.isActive()) {
        marquee.onPointerMove(e);
        return;
      }
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      panStart.current = { x: e.clientX, y: e.clientY };
      pendingPan.current.dx += dx;
      pendingPan.current.dy += dy;
      if (panRafId.current) return;
      panRafId.current = requestAnimationFrame(() => {
        panRafId.current = null;
        panBy(pendingPan.current.dx, pendingPan.current.dy);
        pendingPan.current = { dx: 0, dy: 0 };
      });
    },
    [panBy, marquee]
  );

  const onPointerUp = useCallback(() => {
    if (marquee?.isActive()) {
      marquee.onPointerUp();
      return;
    }
    isPanning.current = false;
    if (containerRef.current) delete containerRef.current.dataset.panning;
    if (panRafId.current) {
      cancelAnimationFrame(panRafId.current);
      panRafId.current = null;
    }
    pendingPan.current = { dx: 0, dy: 0 };
  }, [containerRef, marquee]);

  return { onPointerDown, onPointerMove, onPointerUp };
}
