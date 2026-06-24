"use client";

import { create } from "zustand";
import { Card } from "@/lib/api/schemas";

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface Marquee {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CanvasState {
  viewport: Viewport;
  selectedIds: Set<string>;
  draggingId: string | null;
  localCards: Map<string, Card>;
  marquee: Marquee | null;
  mode: "read" | "edit";

  setViewport: (vp: Partial<Viewport>) => void;
  panBy: (dx: number, dy: number) => void;
  zoomTo: (scale: number, originX: number, originY: number) => void;
  selectCard: (id: string, multi?: boolean) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  setDragging: (id: string | null) => void;
  upsertLocalCard: (card: Card) => void;
  upsertLocalCards: (cards: Card[]) => void;
  removeLocalCard: (id: string) => void;
  setLocalCards: (cards: Card[]) => void;
  setMarquee: (m: Marquee | null) => void;
  setMode: (mode: "read" | "edit") => void;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  viewport: { x: 0, y: 0, scale: 1 },
  selectedIds: new Set(),
  draggingId: null,
  localCards: new Map(),
  marquee: null,
  mode: "edit",

  setViewport: (vp) => set((s) => ({ viewport: { ...s.viewport, ...vp } })),

  panBy: (dx, dy) =>
    set((s) => ({ viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy } })),

  zoomTo: (scale, originX, originY) =>
    set((s) => {
      const clamped = Math.min(Math.max(scale, 0.1), 4);
      const ratio = clamped / s.viewport.scale;
      return {
        viewport: {
          x: originX - (originX - s.viewport.x) * ratio,
          y: originY - (originY - s.viewport.y) * ratio,
          scale: clamped,
        },
      };
    }),

  selectCard: (id, multi = false) =>
    set((s) => {
      const next = multi ? new Set(s.selectedIds) : new Set<string>();
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),

  setSelection: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set() }),

  setDragging: (id) => set({ draggingId: id }),

  upsertLocalCard: (card) =>
    set((s) => {
      const m = new Map(s.localCards);
      m.set(card.id, card);
      return { localCards: m };
    }),

  upsertLocalCards: (cards) =>
    set((s) => {
      const m = new Map(s.localCards);
      cards.forEach((c) => m.set(c.id, c));
      return { localCards: m };
    }),

  removeLocalCard: (id) =>
    set((s) => {
      const m = new Map(s.localCards);
      m.delete(id);
      return { localCards: m };
    }),

  setLocalCards: (cards) =>
    set({ localCards: new Map(cards.map((c) => [c.id, c])) }),

  setMarquee: (m) => set({ marquee: m }),

  setMode: (mode) => set({ mode }),
}));
