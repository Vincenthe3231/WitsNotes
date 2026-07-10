"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Application, Graphics } from "pixi.js";
import { Pen, Eraser } from "lucide-react";
import { useUpdateCard } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";
import { Stroke, StrokePoint, strokeToOutline, eraseAt } from "@/lib/canvas/sketch";

interface Props {
  card: Card;
  boardId: string;
}

const COLORS = ["#0F172A", "#0D9488", "#F97316", "#DC2626", "#2563EB"];
const SIZES = [2, 4, 8, 14];
const ERASER_RADIUS = 10;

function parseStrokes(content: Record<string, unknown> | null): Stroke[] {
  if (!content || !Array.isArray(content.strokes)) return [];
  return content.strokes as Stroke[];
}

export function SketchCard({ card, boardId }: Props) {
  const { mutate: updateCard } = useUpdateCard();

  const canvasHostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const committedLayerRef = useRef<Graphics | null>(null);
  const activeLayerRef = useRef<Graphics | null>(null);
  const strokesRef = useRef<Stroke[]>(parseStrokes(card.content));
  const activePointsRef = useRef<StrokePoint[]>([]);
  const drawingRef = useRef(false);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);

  const persist = useCallback(
    (strokes: Stroke[]) => {
      strokesRef.current = strokes;
      // Sketches have no searchable text — omit content_text entirely rather
      // than sending null (UpdateCardSchema requires it to be a string when present).
      updateCard({ boardId, id: card.id, input: { content: { strokes } } });
    },
    [boardId, card.id, updateCard]
  );

  const redrawCommitted = useCallback(() => {
    const layer = committedLayerRef.current;
    if (!layer) return;
    layer.clear();
    for (const stroke of strokesRef.current) {
      const outline = strokeToOutline(stroke);
      if (outline.length < 3) continue;
      layer.poly(outline.flat()).fill({ color: stroke.color });
    }
  }, []);

  // Mount Pixi app once per card.
  useEffect(() => {
    let cancelled = false;
    const host = canvasHostRef.current;
    if (!host) return;

    const app = new Application();
    app
      .init({
        width: host.clientWidth || 320,
        height: host.clientHeight || 200,
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: host,
      })
      .then(() => {
        if (cancelled) {
          app.destroy(true);
          return;
        }
        appRef.current = app;
        host.appendChild(app.canvas);

        const committed = new Graphics();
        const active = new Graphics();
        app.stage.addChild(committed, active);
        committedLayerRef.current = committed;
        activeLayerRef.current = active;

        redrawCommitted();
      });

    return () => {
      cancelled = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      committedLayerRef.current = null;
      activeLayerRef.current = null;
    };
    // Only (re)mount the Pixi app when the card identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  // Redraw committed strokes whenever the persisted content changes externally
  // (e.g. sync from another client) without tearing down the Pixi app.
  useEffect(() => {
    strokesRef.current = parseStrokes(card.content);
    redrawCommitted();
  }, [card.content, redrawCommitted]);

  function toCanvasPoint(e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } {
    const rect = canvasHostRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const pt = toCanvasPoint(e);
    drawingRef.current = true;

    if (tool === "eraser") {
      const next = eraseAt(strokesRef.current, pt, ERASER_RADIUS);
      if (next.length !== strokesRef.current.length) {
        strokesRef.current = next;
        redrawCommitted();
      }
      return;
    }

    activePointsRef.current = [{ x: pt.x, y: pt.y, pressure: e.pressure || 0.5 }];
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawingRef.current) return;
    e.stopPropagation();
    const pt = toCanvasPoint(e);

    if (tool === "eraser") {
      const next = eraseAt(strokesRef.current, pt, ERASER_RADIUS);
      if (next.length !== strokesRef.current.length) {
        strokesRef.current = next;
        redrawCommitted();
      }
      return;
    }

    activePointsRef.current = [...activePointsRef.current, { x: pt.x, y: pt.y, pressure: e.pressure || 0.5 }];
    const active = activeLayerRef.current;
    if (!active) return;
    const outline = strokeToOutline({ id: "active", points: activePointsRef.current, color, size });
    active.clear();
    if (outline.length >= 3) {
      active.poly(outline.flat()).fill({ color });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawingRef.current) return;
    e.stopPropagation();
    drawingRef.current = false;

    if (tool === "eraser") {
      persist(strokesRef.current);
      return;
    }

    activeLayerRef.current?.clear();
    if (activePointsRef.current.length === 0) return;

    const newStroke: Stroke = {
      id: crypto.randomUUID(),
      points: activePointsRef.current,
      color,
      size,
    };
    activePointsRef.current = [];
    persist([...strokesRef.current, newStroke]);
    redrawCommitted();
  }

  return (
    <div
      className="glass-card h-full flex flex-col rounded-xl overflow-hidden"
      style={{ background: "var(--color-surface)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center gap-1 px-2 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
        aria-label="Sketch tools"
      >
        <button
          onClick={() => setTool("pen")}
          aria-label="Pen tool"
          aria-pressed={tool === "pen"}
          className="cursor-pointer flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 28,
            height: 28,
            background: tool === "pen" ? "var(--color-primary)" : "transparent",
            color: tool === "pen" ? "#fff" : "var(--color-text-muted)",
            boxShadow: tool === "pen" ? "inset 0 2px 4px rgba(0,0,0,0.15)" : undefined,
          }}
        >
          <Pen size={14} />
        </button>
        <button
          onClick={() => setTool("eraser")}
          aria-label="Eraser tool"
          aria-pressed={tool === "eraser"}
          className="cursor-pointer flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 28,
            height: 28,
            background: tool === "eraser" ? "var(--color-primary)" : "transparent",
            color: tool === "eraser" ? "#fff" : "var(--color-text-muted)",
            boxShadow: tool === "eraser" ? "inset 0 2px 4px rgba(0,0,0,0.15)" : undefined,
          }}
        >
          <Eraser size={14} />
        </button>

        <div style={{ width: 1, height: 18, background: "var(--color-border)", margin: "0 4px" }} aria-hidden />

        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            aria-label={`Stroke thickness ${s}`}
            aria-pressed={size === s}
            className="cursor-pointer flex items-center justify-center rounded-full"
            style={{ width: 22, height: 22, background: size === s ? "var(--color-surface-glass)" : "transparent", boxShadow: size === s ? "inset 0 1px 3px rgba(0,0,0,0.18)" : undefined }}
          >
            <span style={{ width: Math.min(s, 12), height: Math.min(s, 12), borderRadius: "50%", background: "var(--color-text-muted)" }} />
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: "var(--color-border)", margin: "0 4px" }} aria-hidden />

        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
            className="cursor-pointer rounded-full"
            style={{
              width: 16,
              height: 16,
              background: c,
              border: color === c ? "2px solid var(--color-text)" : "1px solid var(--color-border)",
            }}
          />
        ))}
      </div>

      <div
        ref={canvasHostRef}
        className="flex-1 relative touch-none"
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        aria-label="Sketch canvas — requires a pointer device to draw"
      />
    </div>
  );
}
