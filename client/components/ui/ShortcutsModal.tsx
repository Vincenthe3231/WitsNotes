"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ShortcutEntry {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutEntry[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Canvas",
    items: [
      { keys: "Drag",           description: "Pan canvas" },
      { keys: "Scroll",         description: "Zoom in / out" },
      { keys: "Shift+Drag",     description: "Marquee select" },
    ],
  },
  {
    title: "Selection",
    items: [
      { keys: "Click",          description: "Select card" },
      { keys: "Cmd/Ctrl+Click", description: "Multi-select" },
      { keys: "Cmd/Ctrl+A",     description: "Select all" },
      { keys: "Esc",            description: "Clear selection" },
    ],
  },
  {
    title: "Cards",
    items: [
      { keys: "Delete / ⌫",    description: "Delete selected" },
      { keys: "Cmd/Ctrl+D",     description: "Duplicate selected" },
      { keys: "Drag (selected)",description: "Move group" },
    ],
  },
  {
    title: "General",
    items: [
      { keys: "?",              description: "Open this cheatsheet" },
    ],
  },
];

interface Props {
  onClose: () => void;
}

export function ShortcutsModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap + Esc
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        style={{
          outline: "none",
          minWidth: 340,
          maxWidth: 480,
          width: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          borderRadius: 16,
          padding: 24,
          background: "var(--color-surface)",
          backdropFilter: "blur(24px)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 16px 64px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", color: "var(--color-text-muted)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              {group.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.items.map(({ keys, description }) => (
                <div key={keys} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--color-text)" }}>{description}</span>
                  <kbd style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "var(--color-border)", color: "var(--color-text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
