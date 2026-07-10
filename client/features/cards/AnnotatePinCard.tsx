"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useUpdateCard } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";
import { formatPinPreview } from "@/lib/canvas/annotate";

interface Props {
  card: Card;
  boardId: string;
}

function parseNote(content: Record<string, unknown> | null): string {
  return typeof content?.text === "string" ? content.text : "";
}

/**
 * Position-anchored ink/pin annotation (Phase 5 "Annotate"). Scoped per
 * ADR: pins only, no threaded replies -- that's Phase 3's deferred
 * "Comments" feature. A pin is just a small marker + a single note.
 */
export function AnnotatePinCard({ card, boardId }: Props) {
  const { mutate: updateCard } = useUpdateCard();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(() => parseNote(card.content));

  function persist(next: string) {
    setNote(next);
    updateCard({ boardId, id: card.id, input: { content: { text: next }, content_text: next } });
  }

  return (
    <div
      className="h-full w-full relative"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Collapse annotation pin" : "Expand annotation pin"}
        aria-expanded={open}
        className="flex items-center justify-center rounded-full cursor-pointer"
        style={{
          width: "100%",
          height: "100%",
          background: "var(--color-primary)",
          color: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          border: "2px solid var(--color-surface)",
        }}
      >
        <MapPin size={16} />
      </button>

      {open && (
        <div
          className="absolute rounded-xl p-2"
          style={{
            top: "100%",
            left: 0,
            marginTop: 4,
            width: 200,
            background: "var(--color-surface-glass)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            zIndex: 30,
          }}
        >
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={(e) => persist(e.target.value)}
            placeholder="Add a note…"
            rows={3}
            className="w-full text-xs outline-none resize-none"
            style={{ background: "transparent", border: "none", color: "var(--color-text)" }}
          />
          {!note && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {formatPinPreview(note)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
