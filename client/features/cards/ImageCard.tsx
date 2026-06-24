"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
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

export function ImageCard({ card }: Props) {
  const content = (card.content ?? {}) as MediaContent;
  const [open, setOpen] = useState(false);

  if (content.status === "uploading") {
    return (
      <div
        style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--color-surface)" }}
        aria-live="polite"
        aria-label={`Uploading… ${content.progress ?? 0}%`}
      >
        <ImageIcon size={28} style={{ color: "var(--color-text-muted)", opacity: 0.4 }} />
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
        <ImageIcon size={24} style={{ color: "var(--color-text-muted)", opacity: 0.3 }} />
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Upload failed</span>
      </div>
    );
  }

  return (
    <>
      <div
        style={{ width: "100%", height: "100%", cursor: "pointer", overflow: "hidden" }}
        onClick={() => setOpen(true)}
        role="button"
        aria-label={`View image: ${content.original_name ?? card.title ?? "image"}`}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={content.url}
          alt={card.title ?? content.original_name ?? "image"}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal
          aria-label="Full-size image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.url}
            alt={card.title ?? content.original_name ?? "image"}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
