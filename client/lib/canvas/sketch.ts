import { getStroke } from "perfect-freehand";

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  size: number;
}

/**
 * Converts a raw stroke's input points into a smoothed, filled outline
 * (pairs of [x, y]) via perfect-freehand, ready to hand to a renderer
 * (e.g. a filled PIXI.Graphics polygon).
 */
export function strokeToOutline(stroke: Stroke): number[][] {
  return getStroke(
    stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
    { size: stroke.size, thinning: 0.5, smoothing: 0.5, streamline: 0.5 }
  );
}

function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * True if `point` (within `radius`) touches any segment of `stroke`,
 * accounting for the stroke's own rendered thickness. Used by the eraser
 * tool to hit-test strokes for removal without needing to rasterize.
 */
export function hitTestStroke(
  stroke: Stroke,
  point: { x: number; y: number },
  radius: number
): boolean {
  const threshold = radius + stroke.size / 2;
  const pts = stroke.points;
  if (pts.length === 1) {
    return Math.hypot(point.x - pts[0].x, point.y - pts[0].y) <= threshold;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    if (distanceToSegment(point, pts[i], pts[i + 1]) <= threshold) {
      return true;
    }
  }
  return false;
}

/** Removes any strokes that the eraser (at `point`, with `radius`) touches. */
export function eraseAt(
  strokes: Stroke[],
  point: { x: number; y: number },
  radius: number
): Stroke[] {
  return strokes.filter((s) => !hitTestStroke(s, point, radius));
}
