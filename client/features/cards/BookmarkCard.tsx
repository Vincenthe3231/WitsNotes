"use client";

import { useEffect, useState } from "react";
import { useUpdateCard, useUnfurlUrl } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";
import { Bookmark, ExternalLink, Loader2 } from "lucide-react";

interface BookmarkData {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
  favicon?: string;
}

interface Props {
  card: Card;
  boardId: string;
}

function parseBookmark(content: Record<string, unknown> | null): BookmarkData {
  if (!content) return {};
  return content as BookmarkData;
}

export function BookmarkCard({ card, boardId }: Props) {
  const { mutate: updateCard } = useUpdateCard(boardId);
  const [data, setData] = useState<BookmarkData>(() => parseBookmark(card.content));
  const [editing, setEditing] = useState(!data.url);
  const [pendingUrl, setPendingUrl] = useState("");

  const { data: unfurled, isFetching: unfurling } = useUnfurlUrl(pendingUrl);

  useEffect(() => {
    if (unfurled && pendingUrl) {
      const url = pendingUrl;
      const u = unfurled;
      setTimeout(() => {
        setData((d) => ({
          url,
          title: u.title ?? d.title,
          description: u.description ?? d.description,
          image: u.image ?? d.image,
          site_name: u.site_name ?? d.site_name,
          favicon: u.favicon ?? d.favicon,
        }));
        setPendingUrl("");
      }, 0);
    }
  }, [unfurled, pendingUrl]);

  function save(next: BookmarkData) {
    setData(next);
    updateCard({
      id: card.id,
      input: {
        content: next as Record<string, unknown>,
        content_text: `${next.title ?? ""} ${next.url ?? ""}`.trim(),
      },
    });
  }

  if (editing) {
    return (
      <div
        className="glass-card h-full flex flex-col rounded-xl overflow-hidden p-3 gap-2"
        style={{ background: "var(--color-surface)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Bookmark</p>

        <div>
          <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>URL</label>
          <input
            type="url"
            value={data.url ?? ""}
            onChange={(e) => setData((d) => ({ ...d, url: e.target.value }))}
            onBlur={(e) => { const u = e.target.value.trim(); if (u.startsWith("http")) setPendingUrl(u); }}
            placeholder="https://…"
            className="w-full text-sm px-2 py-1 rounded-lg border outline-none"
            style={{ background: "transparent", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          {unfurling && <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><Loader2 size={10} className="animate-spin" /> Loading preview…</span>}
        </div>

        {[
          { label: "Title", key: "title" as const },
          { label: "Note", key: "description" as const },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</label>
            <input
              type="text"
              value={data[key] ?? ""}
              onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
              className="w-full text-sm px-2 py-1 rounded-lg border outline-none"
              style={{ background: "transparent", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
          </div>
        ))}

        <button
          onClick={() => { save(data); setEditing(false); }}
          className="self-end text-sm px-3 py-1 rounded-lg cursor-pointer"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >Save</button>
      </div>
    );
  }

  return (
    <div
      className="glass-card h-full flex flex-col rounded-xl overflow-hidden"
      style={{ background: "var(--color-surface)" }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={() => setEditing(true)}
    >
      {data.image && (
        <img src={data.image} alt="" className="w-full object-cover" style={{ maxHeight: 80 }} />
      )}
      <div className="flex flex-col gap-1 p-3 flex-1">
        <div className="flex items-center gap-2">
          {data.favicon
            ? <img src={data.favicon} width={14} height={14} alt="" style={{ flexShrink: 0, borderRadius: 2 }} />
            : <Bookmark size={14} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
          }
          <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{data.title || data.url}</p>
        </div>
        {data.description && (
          <p className="text-xs line-clamp-2" style={{ color: "var(--color-text-muted)" }}>{data.description}</p>
        )}
        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs mt-auto cursor-pointer"
            style={{ color: "var(--color-primary)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
            {data.site_name || (() => { try { return new URL(data.url).hostname; } catch { return data.url; } })()}
          </a>
        )}
      </div>
    </div>
  );
}
