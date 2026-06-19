"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { Block, BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  FormattingToolbar,
  FormattingToolbarController,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { SuggestionMenuProps } from "@blocknote/react";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { useCallback, useEffect, useRef } from "react";
import { useUpdateCard, useBoard } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";
import { Alert, ALERT_TYPES, AlertLevel } from "@/features/editor/AlertBlock";
import { useThemeMode } from "@/hooks/useThemeMode";
import { uploadAttachment } from "@/lib/api/boards";
import { NotebookMention } from "@/features/editor/NotebookMention";
import { flattenTabsForMention } from "@/lib/notebook/tree";
import { BookOpen } from "lucide-react";
import { sanitizeBlocks } from "@/lib/notebook/sanitizeBlocks";

interface Props {
  card: Card;
  boardId: string;
}

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, alert: Alert },
  inlineContentSpecs: { ...defaultInlineContentSpecs, notebookMention: NotebookMention },
});

function isBlockNoteContent(v: unknown): v is { blocks: Block[] } {
  return (
    !!v &&
    typeof v === "object" &&
    Array.isArray((v as Record<string, unknown>).blocks)
  );
}

export function extractText(blocks: Block[]): string {
  return blocks
    .flatMap((b) =>
      Array.isArray(b.content)
        ? b.content
            .filter((c) => c.type === "text")
            .map((c) => (c as { type: "text"; text: string }).text)
        : []
    )
    .join(" ");
}

function CompactSlashMenu(props: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const idx = props.selectedIndex ?? 0;
    itemRefs.current[idx]?.scrollIntoView({ block: "nearest" });
  }, [props.selectedIndex]);

  return (
    <div style={{
      background: "var(--color-surface, #1e1e2e)",
      border: "1px solid var(--glass-border, rgba(255,255,255,0.1))",
      borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      padding: "4px 0",
      minWidth: 160,
      maxHeight: 240,
      overflowY: "auto",
      fontSize: 13,
    }}>
      {props.items.map((item, i) => (
        <div
          key={`${item.title}-${i}`}
          ref={(el) => { itemRefs.current[i] = el; }}
          onClick={() => props.onItemClick?.(item)}
          style={{
            padding: "5px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--color-text, #e2e8f0)",
            background: i === props.selectedIndex ? "var(--color-primary, #6366f1)" : "transparent",
            borderRadius: 4,
            margin: "0 4px",
          }}
        >
          {item.icon && <span style={{ opacity: 0.7, fontSize: 12 }}>{item.icon}</span>}
          <span>{item.title}</span>
        </div>
      ))}
    </div>
  );
}

export function NotionEditor({ card, boardId }: Props) {
  const { mutate: updateCard } = useUpdateCard(boardId);
  const { dark } = useThemeMode();
  const { data: boardData } = useBoard(boardId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawContent = isBlockNoteContent(card.content) ? card.content.blocks : null;
  const sanitized = rawContent ? sanitizeBlocks(rawContent) : [];
  const initialContent = sanitized.length ? sanitized : undefined;

  const editor = useCreateBlockNote({ schema, initialContent, uploadFile: uploadAttachment });

  const debouncedSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const blocks = editor.document;
      const content_text = extractText(blocks as Block[]);
      const firstBlock = (blocks as Block[]).find((b) => Array.isArray(b.content) && (b.content as unknown[]).length > 0);
      const firstText = firstBlock && Array.isArray(firstBlock.content)
        ? (firstBlock.content as { type: string; text?: string }[])
            .filter((c) => c.type === "text").map((c) => c.text ?? "").join("").slice(0, 80)
        : "";
      updateCard({
        id: card.id,
        input: {
          content: { blocks },
          content_text,
          title: firstText ?? "",
        },
      });
    }, 800);
  }, [card.id, editor, updateCard]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  return (
    <BlockNoteView
      editor={editor}
      onChange={debouncedSave}
      theme={dark ? "dark" : "light"}
      slashMenu={false}
      formattingToolbar={false}
      className="bn-no-placeholder-highlight"
    >
      <FormattingToolbarController formattingToolbar={() => <FormattingToolbar />} />
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) => {
          const defaults = getDefaultReactSlashMenuItems(editor);
          const withoutHeadings = defaults.filter(
            (item) => !item.title.startsWith("Heading") && !item.title.startsWith("Toggle Heading")
          );
          const headingItems: DefaultReactSuggestionItem[] = ([1, 2, 3] as const).map((level) => ({
            title: `Heading ${level}`,
            onItemClick: () => {
              const b = insertOrUpdateBlockForSlashMenu(editor, { type: "heading", props: { level, isToggleable: true } });
              queueMicrotask(() => window.localStorage.setItem(`toggle-${b.id}`, "true"));
            },
            aliases: [`h${level}`, `heading${level}`, "toggle"],
            group: "Headings",
            icon: <span style={{ fontWeight: 700, fontSize: 13 }}>H{level}</span>,
            subtext: `Level ${level} collapsible heading`,
          }));
          const alertItems: DefaultReactSuggestionItem[] = (Object.entries(ALERT_TYPES) as [AlertLevel, { icon: string; color: string }][]).map(([level, { icon, color }]) => ({
            title: `Alert — ${level.charAt(0).toUpperCase() + level.slice(1)}`,
            onItemClick: () => {
              const b = insertOrUpdateBlockForSlashMenu(editor, { type: "alert" as const, props: { level } });
              requestAnimationFrame(() => editor.setTextCursorPosition(b, "start"));
            },
            aliases: ["callout", "alert", level],
            group: "Callouts",
            icon: <span style={{ color }}>{icon}</span>,
            badge: undefined,
            subtext: `${level} callout`,
          }));
          return [...withoutHeadings, ...headingItems, ...alertItems].filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.aliases?.some((a) => a.includes(query.toLowerCase()))
          );
        }}
        suggestionMenuComponent={CompactSlashMenu}
      />
      <SuggestionMenuController
        triggerCharacter="@"
        getItems={async (query) => {
          const allCards = boardData?.cards ?? [];
          const targets = flattenTabsForMention(allCards);
          return targets
            .filter((t) => t.label.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 20)
            .map((t): DefaultReactSuggestionItem => ({
              title: t.label,
              onItemClick: () => {
                editor.insertInlineContent([
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  { type: "notebookMention" as any, props: { boardId: t.boardId, cardId: t.cardId, tabId: t.tabId ?? "", label: t.label } },
                  " ",
                ]);
              },
              aliases: [t.path],
              group: "References",
              icon: <BookOpen size={14} />,
            }));
        }}
        suggestionMenuComponent={CompactSlashMenu}
      />
    </BlockNoteView>
  );
}
