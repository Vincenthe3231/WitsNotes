"use client";

import { FileText, CheckSquare, Bookmark, Link2, Plus } from "lucide-react";
import { useCreateCard } from "@/lib/api/hooks";
import { useCanvasStore } from "@/stores/canvasStore";
import { CardType } from "@/lib/api/schemas";

const PALETTE_ITEMS: { type: CardType; icon: React.ReactNode; label: string }[] = [
  { type: "notebook", icon: <FileText size={18} />,    label: "Notebook" },
  { type: "todo",     icon: <CheckSquare size={18} />, label: "To-do" },
  { type: "bookmark",  icon: <Bookmark size={18} />,   label: "Bookmark" },
  { type: "link_list", icon: <Link2 size={18} />,      label: "Links" },
];

interface Props {
  boardId: string;
}

export function CardPalette({ boardId }: Props) {
  const { mutate: createCard } = useCreateCard(boardId);
  const viewport = useCanvasStore((s) => s.viewport);

  function spawnCard(type: CardType) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = type === "link_list" ? 280 : 320;
    const h = type === "link_list" ? 320 : 200;
    const x = Math.round(((vw / 2 - viewport.x) / viewport.scale - w / 2));
    const y = Math.round(((vh / 2 - viewport.y) / viewport.scale - h / 2));
    createCard({ type, x, y, w, h, z: 10, rotation: 0 });
  }

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-2xl z-30"
      style={{
        backdropFilter: "blur(20px)",
        background: "var(--color-surface-glass)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
      }}
      aria-label="Card palette"
    >
      {PALETTE_ITEMS.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => spawnCard(type)}
          title={`Add ${label}`}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
          style={{
            color: "var(--color-text-muted)",
            background: "transparent",
          }}
          aria-label={`Add ${label} card`}
        >
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}

      <div
        className="w-px h-8 mx-1"
        style={{ background: "var(--color-border)" }}
        aria-hidden
      />

      <button
        className="flex items-center gap-1 px-3 py-2 rounded-xl cursor-pointer text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95"
        style={{ background: "var(--color-primary)", color: "#fff" }}
        onClick={() => spawnCard("notebook")}
        aria-label="Quick add notebook"
      >
        <Plus size={16} />
        Add
      </button>
    </div>
  );
}
