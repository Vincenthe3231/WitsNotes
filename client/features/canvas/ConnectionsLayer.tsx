"use client";

import { Card, Connection } from "@/lib/api/schemas";
import { cardCenter, resolveConnectionEndpoints } from "@/lib/canvas/connections";

interface Props {
  cards: Card[];
  connections: Connection[];
  /** Live drag-to-connect preview: source card id + cursor (canvas coords). */
  connectingFrom?: string | null;
  connectingCursor?: { x: number; y: number } | null;
}

/**
 * Renders mind-map connection edges between cards. Absolutely positioned
 * sibling of the card list, inside the same viewport-transformed wrapper —
 * an SVG with no explicit viewBox uses 1 unit = 1px, so card coordinates
 * (already in canvas space) can be used directly as line endpoints.
 */
export function ConnectionsLayer({ cards, connections, connectingFrom, connectingCursor }: Props) {
  const resolved = resolveConnectionEndpoints(cards, connections);
  const source = connectingFrom ? cards.find((c) => c.id === connectingFrom) : null;

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }}
      aria-hidden
    >
      <defs>
        <marker id="connection-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-text-muted)" />
        </marker>
      </defs>

      {resolved.map(({ connection, from, to }) => {
        const a = cardCenter(from);
        const b = cardCenter(to);
        return (
          <line
            key={connection.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-text-muted)"
            strokeOpacity={0.6}
            strokeWidth={2}
            strokeDasharray={connection.kind === "link" ? "4 4" : undefined}
            markerEnd={connection.kind === "arrow" ? "url(#connection-arrow)" : undefined}
          />
        );
      })}

      {source && connectingCursor && (
        <line
          x1={cardCenter(source).x}
          y1={cardCenter(source).y}
          x2={connectingCursor.x}
          y2={connectingCursor.y}
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      )}
    </svg>
  );
}
