"use client";

import { useRef, useEffect } from "react";
import { FileText, CheckSquare, Bookmark, Link2, Plus, Image as ImageIcon, Music, Paperclip, Hand, MousePointer2 } from "lucide-react";
import { useCreateCard, useUpdateCard } from "@/lib/api/hooks";
import { useCanvasStore } from "@/stores/canvasStore";
import { Card, CardType } from "@/lib/api/schemas";
import { uploadCardAttachment } from "@/lib/api/uploadCardAttachment";
import { canvasCenter } from "@/lib/canvas/coords";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useBoardDocContext } from "@/lib/collab/BoardDocContext";
import { ydocInsertCard } from "@/lib/collab/ydocMutations";

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
  const mode = useCanvasStore((s) => s.mode);
  const setMode = useCanvasStore((s) => s.setMode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { isCollab, ydoc } = useBoardDocContext();

  // H/V keyboard handlers
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setMode("read");
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setMode("edit");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setMode]);

  async function spawnCard(type: CardType) {
    const w = type === "link_list" ? 280 : 320;
    const h = type === "link_list" ? 320 : 200;
    const center = canvasCenter(viewport);
    const x = Math.round(center.x - w / 2);
    const y = Math.round(center.y - h / 2);

    // REST-create first (server owns id + created_by), then mirror into the Y.Doc on collab boards.
    const card = await createCardAsync({ boardId, type, x, y, w, h, z: 10, rotation: 0 });
    if (isCollab) ydocInsertCard(ydoc, card);
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
    // REST-create first so the attachment has a real cards row to bind to.
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

    // Mirror into the Y.Doc on collab boards so the card renders + syncs to peers.
    if (isCollab) ydocInsertCard(ydoc, card);
    console.log("[upload] card created, starting attachment upload", card.id, file.name, file.size);

    try {
      await uploadCardAttachment({ boardId, card, file, upsertLocalCard, updateCard: (vars) => updateCard(vars) });
    } catch (err) {
      console.error("[upload] uploadCardAttachment threw (uncaught)", err);
    }
    pendingFile.current = null;
  }

  const transitionDuration = prefersReducedMotion ? "0ms" : "200ms";
  const collapsedMaxWidth = mode === "edit" ? "none" : "0px";
  const collapsedOpacity = mode === "edit" ? 1 : 0;
  const collapsedPointerEvents = mode === "edit" ? "auto" : "none";

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
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-0 rounded-2xl z-30"
        style={{
          backdropFilter: "blur(20px)",
          background: "var(--color-surface-glass)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        }}
        aria-label="Card palette"
      >
        {/* Mode segment — always visible, neumorphic inset pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px",
            borderRadius: 12,
            background: "var(--color-surface-glass)",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.14)",
            marginRight: 4,
          }}
        >
          {[
            { m: "read", Icon: Hand, label: "Read (H)", title: "Read mode: pan & zoom only" },
            { m: "edit", Icon: MousePointer2, label: "Edit (V)", title: "Edit mode: full interaction" },
          ].map(({ m, Icon, label, title }) => (
            <button
              key={m}
              onClick={() => setMode(m as "read" | "edit")}
              title={title}
              aria-label={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                minWidth: 44,
                padding: 8,
                borderRadius: 8,
                border: "none",
                background: mode === m ? "var(--color-primary)" : "transparent",
                color: mode === m ? "#fff" : "var(--color-text-muted)",
                cursor: "pointer",
                transition: `background 150ms, color 150ms`,
              }}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Collapsible content group — notebook, todo, bookmark, links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            maxWidth: collapsedMaxWidth,
            opacity: collapsedOpacity,
            transition: `max-width ${transitionDuration}, opacity ${transitionDuration}`,
            overflow: "hidden",
            pointerEvents: collapsedPointerEvents,
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          {PALETTE_ITEMS.map(({ type, icon }) => (
            <button
              key={type}
              onClick={() => spawnCard(type)}
              title={type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
              className="flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                minHeight: 44,
                minWidth: 44,
                padding: 8,
                borderRadius: 8,
                background: "transparent",
                color: "var(--color-text-muted)",
                border: "none",
              }}
              aria-label={`Add ${type.replace("_", " ")} card`}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            maxWidth: collapsedMaxWidth,
            opacity: collapsedOpacity,
            transition: `max-width ${transitionDuration}, opacity ${transitionDuration}`,
            overflow: "hidden",
            pointerEvents: collapsedPointerEvents,
          }}
          aria-hidden
        >
          <div style={{ width: 1, height: 32, background: "var(--glass-border)", margin: "0 4px" }} />
        </div>

        {/* Collapsible media group — image, audio, file */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            maxWidth: collapsedMaxWidth,
            opacity: collapsedOpacity,
            transition: `max-width ${transitionDuration}, opacity ${transitionDuration}`,
            overflow: "hidden",
            pointerEvents: collapsedPointerEvents,
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          <button
            onClick={() => openFilePicker("image/*")}
            title="Upload image"
            className="flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: 8,
              borderRadius: 8,
              background: "transparent",
              color: "var(--color-text-muted)",
              border: "none",
            }}
            aria-label="Upload image"
          >
            <ImageIcon size={16} />
          </button>

          <button
            onClick={() => openFilePicker("audio/*")}
            title="Upload audio"
            className="flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: 8,
              borderRadius: 8,
              background: "transparent",
              color: "var(--color-text-muted)",
              border: "none",
            }}
            aria-label="Upload audio"
          >
            <Music size={16} />
          </button>

          <button
            onClick={() => openFilePicker("*/*")}
            title="Upload file"
            className="flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: 8,
              borderRadius: 8,
              background: "transparent",
              color: "var(--color-text-muted)",
              border: "none",
            }}
            aria-label="Upload file"
          >
            <Paperclip size={16} />
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            maxWidth: collapsedMaxWidth,
            opacity: collapsedOpacity,
            transition: `max-width ${transitionDuration}, opacity ${transitionDuration}`,
            overflow: "hidden",
            pointerEvents: collapsedPointerEvents,
          }}
          aria-hidden
        >
          <div style={{ width: 1, height: 32, background: "var(--glass-border)", margin: "0 4px" }} />
        </div>

        {/* Collapsible Add button — primary */}
        <div
          style={{
            maxWidth: collapsedMaxWidth,
            opacity: collapsedOpacity,
            transition: `max-width ${transitionDuration}, opacity ${transitionDuration}`,
            overflow: "hidden",
            pointerEvents: collapsedPointerEvents,
            paddingRight: 8,
          }}
        >
          <button
            className="flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: 8,
              borderRadius: 8,
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
            }}
            onClick={() => spawnCard("notebook")}
            aria-label="Quick add notebook"
            title="Quick add notebook"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
