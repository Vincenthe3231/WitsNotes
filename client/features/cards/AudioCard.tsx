"use client";

import { Music2 } from "lucide-react";
import { Card } from "@/lib/api/schemas";

interface MediaContent {
  url?: string;
  original_name?: string;
  status?: "uploading" | "ready" | "error";
  progress?: number;
}

interface Props {
  card: Card;
}

export function AudioCard({ card }: Props) {
  const content = (card.content ?? {}) as MediaContent;

  if (content.status === "uploading") {
    return (
      <div
        style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--color-surface)" }}
        aria-live="polite"
        aria-label={`Uploading… ${content.progress ?? 0}%`}
      >
        <Music2 size={28} style={{ color: "var(--color-text-muted)", opacity: 0.4 }} />
        <div style={{ width: "60%", height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${content.progress ?? 0}%`, background: "var(--color-primary)", transition: "width 150ms" }} />
        </div>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Uploading… {content.progress ?? 0}%</span>
      </div>
    );
  }

  if (content.status === "error" || !content.url) {
    return (
      <div
        style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--color-surface)" }}
        aria-live="polite"
      >
        <Music2 size={24} style={{ color: "var(--color-text-muted)", opacity: 0.3 }} />
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Upload failed</span>
      </div>
    );
  }

  return (
    <div
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 12, background: "var(--color-surface)", boxSizing: "border-box" }}
    >
      <Music2 size={22} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", wordBreak: "break-all" }}>
        {content.original_name ?? card.title ?? "audio"}
      </span>
      <audio controls src={content.url} style={{ width: "100%", minWidth: 0 }} aria-label={content.original_name ?? "audio"} />
    </div>
  );
}
