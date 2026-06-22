"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Trash2, Plus, Loader2 } from "lucide-react";
import { useUpdateCard, useUnfurlUrl } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";

type LinkItem = {
  id: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  site_name?: string;
};

type LinkListContent = { items: LinkItem[] };

function parseContent(content: Record<string, unknown> | null): LinkItem[] {
  return ((content as LinkListContent | null)?.items ?? []);
}

interface Props {
  card: Card;
  boardId: string;
}

function UnfurlRow({ onAdd }: { onAdd: (item: LinkItem) => void }) {
  const [url, setUrl] = useState("");
  const [pendingUrl, setPendingUrl] = useState("");
  const { isFetching, data: unfurled } = useUnfurlUrl(pendingUrl);

  function commit() {
    const u = url.trim();
    if (!u.startsWith("http")) return;
    if (unfurled && pendingUrl === u) {
      onAdd({
        id: crypto.randomUUID(),
        url: u,
        title: unfurled.title,
        description: unfurled.description,
        image: unfurled.image,
        favicon: unfurled.favicon,
        site_name: unfurled.site_name,
      });
      setUrl("");
      setPendingUrl("");
    } else {
      setPendingUrl(u);
    }
  }

  const onAddRef = useRef(onAdd);
  useEffect(() => { onAddRef.current = onAdd; });

  // When unfurl completes, auto-add (deferred to avoid setState-in-effect lint error)
  useEffect(() => {
    if (!unfurled || !pendingUrl || pendingUrl !== url.trim()) return;
    const item: LinkItem = {
      id: crypto.randomUUID(),
      url: pendingUrl,
      title: unfurled.title,
      description: unfurled.description,
      image: unfurled.image,
      favicon: unfurled.favicon,
      site_name: unfurled.site_name,
    };
    queueMicrotask(() => {
      onAddRef.current(item);
      setUrl("");
      setPendingUrl("");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unfurled, pendingUrl]);

  return (
    <div className="flex items-center gap-1 px-2 py-1" style={{ borderTop: "1px solid var(--color-border)" }}>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
        placeholder="Paste URL…"
        className="flex-1 text-xs outline-none"
        style={{ background: "transparent", border: "none", color: "var(--color-text)" }}
      />
      {isFetching
        ? <Loader2 size={12} className="animate-spin" style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        : <button onClick={commit} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-primary)", display: "flex" }}>
            <Plus size={14} />
          </button>
      }
    </div>
  );
}

export function LinksListCard({ card, boardId }: Props) {
  const { mutate: updateCard } = useUpdateCard(boardId);
  const [items, setItems] = useState<LinkItem[]>(() => parseContent(card.content));

  function persist(next: LinkItem[]) {
    setItems(next);
    updateCard({
      id: card.id,
      input: {
        content: { items: next } as Record<string, unknown>,
        content_text: next.map((i) => `${i.title ?? ""} ${i.url}`).join(" ").trim(),
      },
    });
  }

  function addItem(item: LinkItem) {
    persist([...items, item]);
  }

  function removeItem(id: string) {
    persist(items.filter((i) => i.id !== id));
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "var(--color-surface)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {item.favicon
                  ? <img src={item.favicon} width={12} height={12} alt="" style={{ borderRadius: 2, flexShrink: 0 }} />
                  : null
                }
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--color-text)", textDecoration: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.title || item.url}
                </a>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-primary)", flexShrink: 0, display: "flex" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={10} />
                </a>
              </div>
              {item.description && (
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                >
                  {item.description}
                </p>
              )}
            </div>
            {item.image && (
              <img
                src={item.image}
                alt=""
                width={40}
                height={40}
                style={{ objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
              />
            )}
            <button
              onClick={() => removeItem(item.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", flexShrink: 0, padding: 2 }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs px-3 py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
            No links yet. Paste a URL below.
          </p>
        )}
      </div>
      <UnfurlRow onAdd={addItem} />
    </div>
  );
}
