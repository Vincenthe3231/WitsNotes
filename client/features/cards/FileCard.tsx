"use client";

import { File, FileText, FileImage, FileAudio, FileVideo, FileArchive } from "lucide-react";
import { Card } from "@/lib/api/schemas";

interface MediaContent {
  url?: string;
  original_name?: string;
  mime?: string;
  size?: number;
  status?: "uploading" | "ready" | "error";
  progress?: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function FileIcon({ mime }: { mime?: string }) {
  const m = mime ?? "";
  const size = 28;
  const style = { color: "var(--color-primary)", flexShrink: 0 as const };
  if (m.startsWith("image/")) return <FileImage size={size} style={style} />;
  if (m.startsWith("audio/")) return <FileAudio size={size} style={style} />;
  if (m.startsWith("video/")) return <FileVideo size={size} style={style} />;
  if (m.includes("pdf") || m.includes("text")) return <FileText size={size} style={style} />;
  if (m.includes("zip") || m.includes("archive") || m.includes("tar")) return <FileArchive size={size} style={style} />;
  return <File size={size} style={style} />;
}

interface Props {
  card: Card;
}

export function FileCard({ card }: Props) {
  const content = (card.content ?? {}) as MediaContent;

  if (content.status === "uploading") {
    return (
      <div
        style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--color-surface)" }}
        aria-live="polite"
        aria-label={`Uploading… ${content.progress ?? 0}%`}
      >
        <File size={28} style={{ color: "var(--color-text-muted)", opacity: 0.4 }} />
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
        <File size={24} style={{ color: "var(--color-text-muted)", opacity: 0.3 }} />
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Upload failed</span>
      </div>
    );
  }

  return (
    <div
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, background: "var(--color-surface)", boxSizing: "border-box" }}
    >
      <FileIcon mime={content.mime} />
      <span style={{ fontSize: 12, color: "var(--color-text)", textAlign: "center", wordBreak: "break-all", maxWidth: "100%" }}>
        {content.original_name ?? card.title ?? "file"}
      </span>
      {content.size != null && (
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{formatBytes(content.size)}</span>
      )}
      <a
        href={content.url}
        download={content.original_name}
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: 4, padding: "6px 14px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", fontSize: 12, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}
        aria-label={`Download ${content.original_name ?? "file"}`}
      >
        Download
      </a>
    </div>
  );
}
