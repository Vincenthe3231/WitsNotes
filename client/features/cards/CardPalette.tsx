"use client";

import { useRef } from "react";
import { FileText, CheckSquare, Bookmark, Link2, Plus, Image as ImageIcon, Music, Paperclip } from "lucide-react";
import { useCreateCard, useUpdateCard } from "@/lib/api/hooks";
import { useCanvasStore } from "@/stores/canvasStore";
import { Card, CardType } from "@/lib/api/schemas";
import { uploadCardAttachment } from "@/lib/api/uploadCardAttachment";
import { canvasCenter } from "@/lib/canvas/coords";

const PALETTE_ITEMS: { type: CardType; icon: React.ReactNode; label: string }[] = [
  { type: "notebook",  icon: <FileText size={18} />,    label: "Notebook" },
  { type: "todo",      icon: <CheckSquare size={18} />, label: "To-do" },
  { type: "bookmark",  icon: <Bookmark size={18} />,    label: "Bookmark" },
  { type: "link_list", icon: <Link2 size={18} />,       label: "Links" },
];

export function mimeToCardType(mime: string): CardType {
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

interface Props {
  boardId: string;
}

export function CardPalette({ boardId }: Props) {
  const { mutateAsync: createCardAsync } = useCreateCard();
  const { mutate: updateCard } = useUpdateCard();
  const viewport = useCanvasStore((s) => s.viewport);
  const upsertLocalCard = useCanvasStore((s) => s.upsertLocalCard);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);

  function spawnCard(type: CardType) {
    const w = type === "link_list" ? 280 : 320;
    const h = type === "link_list" ? 320 : 200;
    const center = canvasCenter(viewport);
    const x = Math.round(center.x - w / 2);
    const y = Math.round(center.y - h / 2);
    createCardAsync({ boardId, type, x, y, w, h, z: 10, rotation: 0 });
  }

  function openFilePicker(accept: string) {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFile.current = file;

    const type = mimeToCardType(file.type);
    const w = 320;
    const h = type === "audio" || type === "file" ? 180 : 240;
    const center = canvasCenter(viewport);
    const x = Math.round(center.x - w / 2);
    const y = Math.round(center.y - h / 2);

    let card: Card;
    try {
      card = await createCardAsync({
        boardId, type, x, y, w, h, z: 10, rotation: 0,
        title: file.name,
        content: { status: "uploading", progress: 0, original_name: file.name },
        content_text: file.name,
      });
    } catch (err) {
      console.error("[upload] createCardAsync rejected", err);
      pendingFile.current = null;
      return;
    }

    console.log("[upload] card created, starting attachment upload", card.id, file.name, file.size);
    try {
      await uploadCardAttachment({ boardId, card, file, upsertLocalCard, updateCard: (vars) => updateCard(vars) });
    } catch (err) {
      console.error("[upload] uploadCardAttachment threw (uncaught)", err);
    }
    pendingFile.current = null;
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        aria-hidden
        onChange={handleFileChosen}
      />
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
            style={{ color: "var(--color-text-muted)", background: "transparent" }}
            aria-label={`Add ${label} card`}
          >
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}

        <div className="w-px h-8 mx-1" style={{ background: "var(--color-border)" }} aria-hidden />

        <button
          onClick={() => openFilePicker("image/*")}
          title="Upload image"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
          style={{ color: "var(--color-text-muted)", background: "transparent" }}
          aria-label="Upload image"
        >
          <ImageIcon size={18} />
          <span className="text-xs font-medium">Image</span>
        </button>

        <button
          onClick={() => openFilePicker("audio/*")}
          title="Upload audio"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
          style={{ color: "var(--color-text-muted)", background: "transparent" }}
          aria-label="Upload audio"
        >
          <Music size={18} />
          <span className="text-xs font-medium">Audio</span>
        </button>

        <button
          onClick={() => openFilePicker("*/*")}
          title="Upload file"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
          style={{ color: "var(--color-text-muted)", background: "transparent" }}
          aria-label="Upload file"
        >
          <Paperclip size={18} />
          <span className="text-xs font-medium">File</span>
        </button>

        <div className="w-px h-8 mx-1" style={{ background: "var(--color-border)" }} aria-hidden />

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
    </>
  );
}
