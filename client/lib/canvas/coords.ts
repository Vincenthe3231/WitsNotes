interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export function screenToCanvas(clientX: number, clientY: number, viewport: Viewport) {
  return {
    x: (clientX - viewport.x) / viewport.scale,
    y: (clientY - viewport.y) / viewport.scale,
  };
}

export function canvasCenter(viewport: Viewport) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  return screenToCanvas(vw / 2, vh / 2, viewport);
}
