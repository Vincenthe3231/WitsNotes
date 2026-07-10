import { Card } from "@/lib/api/schemas";

export interface GridPosition {
  id: string;
  x: number;
  y: number;
}

export interface MoodboardOptions {
  /** Number of columns in the grid. */
  columns?: number;
  /** Gap between cells, in canvas px — thinner than the freeform default. */
  gutter?: number;
  /** Uniform cell size — cards are placed at this size's top-left, width/height unchanged elsewhere. */
  cellWidth?: number;
  cellHeight?: number;
  originX?: number;
  originY?: number;
}

/**
 * Computes a dense image-grid layout (Milanote "moodboard" arrange):
 * every card gets a uniform-size cell, row-major order, thin gutters.
 * Pure position math — the caller persists each returned {id,x,y} via
 * the existing per-card update mutation. Only x/y change; w/h/rotation
 * are left to the caller (typically left unchanged, cards keep their size).
 */
export function arrangeMoodboardGrid(
  cards: Card[],
  opts: MoodboardOptions = {}
): GridPosition[] {
  const {
    columns = 4,
    gutter = 12,
    cellWidth = 220,
    cellHeight = 220,
    originX = 0,
    originY = 0,
  } = opts;

  return cards.map((card, i) => {
    const row = Math.floor(i / columns);
    const col = i % columns;
    return {
      id: card.id,
      x: originX + col * (cellWidth + gutter),
      y: originY + row * (cellHeight + gutter),
    };
  });
}
