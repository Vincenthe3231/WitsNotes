"use client";

import { Lock, FileText } from "lucide-react";
import { Card, NotebookTab } from "@/lib/api/schemas";
import { flatten } from "@/lib/notebook/tree";
import { NotionEditor } from "@/features/editor/NotionEditorDynamic";

interface Props {
  card: Card;
  boardId: string;
}

function getNotebookTabs(card: Card): NotebookTab[] | null {
  const c = card.content as { tabs?: NotebookTab[] } | null;
  return c?.tabs ?? null;
}

function firstText(tab: NotebookTab | undefined): string {
  const blocks = tab?.blocks as { content?: { text?: string }[] }[] | undefined;
  if (!blocks) return "";
  for (const b of blocks) {
    const t = b.content?.map((c) => c?.text ?? "").join("") ?? "";
    if (t.trim()) return t;
  }
  return "";
}

export function NotebookCard({ card, boardId }: Props) {
  const encrypted = !!(card.style as { encrypted?: boolean } | null)?.encrypted;

  // 1. Locked notebook — never render content (lock placeholder only).
  if (encrypted) {
    return (
      <div
        className="glass-card h-full flex flex-col items-center justify-center gap-2"
        style={{ borderRadius: 0 }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Lock size={22} style={{ color: "var(--color-text-muted)", opacity: 0.6 }} />
        <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          Locked notebook
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
          Double-click to unlock
        </p>
      </div>
    );
  }

  const tabs = getNotebookTabs(card);

  // 2. Notebook preview — live read-only excerpt of the first page (wiki style).
  if (tabs) {
    const count = flatten(tabs).length;
    const firstTab = tabs[0];
    const excerpt = firstText(firstTab);
    return (
      <div
        className="glass-card h-full flex flex-col overflow-hidden"
        style={{ borderRadius: 0, padding: "10px 12px", gap: 4 }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <FileText size={13} style={{ color: "var(--nb-page-icon)", flexShrink: 0 }} />
          <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {card.title ?? "Notebook"}
          </p>
        </div>
        {excerpt && (
          <p
            className="text-xs"
            style={{
              color: "var(--color-text-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {excerpt}
          </p>
        )}
        <p className="text-xs mt-auto flex items-center gap-2" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
          <span>{count} page{count !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>Double-click to open</span>
        </p>
      </div>
    );
  }

  // 3. Legacy note card — inline editor.
  return (
    <div
      className="glass-card h-full flex flex-col overflow-hidden"
      style={{ borderRadius: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <NotionEditor card={card} boardId={boardId} />
    </div>
  );
}
