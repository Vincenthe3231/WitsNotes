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
import type { SuggestionMenuProps, DefaultReactSuggestionItem } from "@blocknote/react";
import React, { useCallback, useEffect, useRef } from "react";
import { NotebookTab } from "@/lib/api/schemas";
import { Alert, ALERT_TYPES, AlertLevel } from "@/features/editor/AlertBlock";
import { useThemeMode } from "@/hooks/useThemeMode";
import { uploadAttachment } from "@/lib/api/boards";
import { useBoard } from "@/lib/api/hooks";
import { NotebookMention } from "@/features/editor/NotebookMention";
import { flattenTabsForMention, generateAnchorId } from "@/lib/notebook/tree";
import { BookOpen } from "lucide-react";
import { nestingEnter } from "@/features/notebook/nestingEnter";
import { sanitizeBlocks } from "@/lib/notebook/sanitizeBlocks";

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, alert: Alert },
  inlineContentSpecs: { ...defaultInlineContentSpecs, notebookMention: NotebookMention },
});


function CompactSlashMenu(props: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const idx = props.selectedIndex ?? 0;
    itemRefs.current[idx]?.scrollIntoView({ block: "nearest" });
  }, [props.selectedIndex]);

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--glass-border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", padding: "4px 0", minWidth: 160, maxHeight: 240, overflowY: "auto", fontSize: 13 }}>
      {props.items.map((item, i) => (
        <div
          key={`${item.title}-${i}`}
          ref={(el) => { itemRefs.current[i] = el; }}
          onClick={() => props.onItemClick?.(item)}
          style={{ padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--color-text)", background: i === props.selectedIndex ? "var(--color-primary)" : "transparent", borderRadius: 4, margin: "0 4px" }}
        >
          {item.icon && <span style={{ opacity: 0.7, fontSize: 12 }}>{item.icon}</span>}
          <span>{item.title}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  tab: NotebookTab;
  boardId: string;
  onChange: (blocks: Block[]) => void;
}


class EditorBoundary extends React.Component<Props, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err: unknown) {
    console.error("[NotebookEditor] initialContent failed — retrying with empty doc:", err, (err as Error)?.cause);
  }
  render() {
    if (this.state.crashed) {
      // Render editor with no initialContent so BlockNote starts with empty doc.
      // The original blocks are preserved in the DB; this avoids overwriting them
      // because onChange only fires on user edits, not on empty-doc mount.
      return <NotebookEditorInner tab={{ ...this.props.tab, blocks: [] }} boardId={this.props.boardId} onChange={this.props.onChange} />;
    }
    return <NotebookEditorInner tab={this.props.tab} boardId={this.props.boardId} onChange={this.props.onChange} />;
  }
}

export function NotebookEditor(props: Props) {
  return <EditorBoundary key={props.tab.id} {...props} />;
}

function NotebookEditorInner({ tab, boardId, onChange }: Props) {
  const { dark } = useThemeMode();
  const { data: boardData } = useBoard(boardId);
  const rawBlocks = tab.blocks?.length ? tab.blocks : null;
  const sanitized = rawBlocks ? sanitizeBlocks(rawBlocks) : [];
  const initialContent = sanitized.length ? sanitized : undefined;
  const editor = useCreateBlockNote({ schema, initialContent, uploadFile: uploadAttachment, extensions: [nestingEnter] });
  const changeRef = useRef(onChange);

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  const handleChange = useCallback(() => {
    changeRef.current(editor.document as Block[]);
  }, [editor]);

  // Update heading and mention block IDs when document changes
  useEffect(() => {
    const blocks = editor.document as Block[];

    // Use a MutationObserver to add IDs to headings and mention blocks as they're rendered
    const observer = new MutationObserver(() => {
      for (const block of blocks) {
        if (block.type === "heading") {
          const content = (block.content as Array<{ text?: string } | null> | null)?.[0]?.text ?? "";
          if (content) {
            const anchor = generateAnchorId(block.id, content);
            // Find the heading element by looking for the text in h1-h3 elements
            const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
            for (const heading of headings) {
              if (heading.textContent === content && !heading.id) {
                heading.id = anchor;
                heading.style.scrollMarginTop = "100px";
              }
            }
          }
        } else {
          // For blocks with mentions, add IDs to the block container
          const inlineContent = (block.content as Array<Record<string, unknown>> | null) || [];
          if (inlineContent.some((c) => c?.type === "notebookMention")) {
            const blockElements = document.querySelectorAll(`[data-block-id="${block.id}"]`);
            for (const blockEl of blockElements) {
              if (!blockEl.id) {
                blockEl.id = `block-${block.id}`;
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [editor.document]);

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme={dark ? "dark" : "light"}
      slashMenu={false}
      formattingToolbar={false}
      className="bn-no-placeholder-highlight"
      style={{ flex: 1, overflow: "auto" }}
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
              // keep toggle expanded immediately after creation
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
              // requestAnimationFrame waits for React's async NodeView mount before re-focusing
              requestAnimationFrame(() => editor.setTextCursorPosition(b, "start"));
            },
            aliases: ["callout", "alert", level],
            group: "Callouts",
            icon: <span style={{ color }}>{icon}</span>,
            badge: undefined,
            subtext: `${level} callout`,
          }));
          return [...withoutHeadings, ...headingItems, ...alertItems].filter((i) =>
            i.title.toLowerCase().includes(query.toLowerCase()) ||
            i.aliases?.some((a) => a.includes(query.toLowerCase()))
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
                  { type: "notebookMention" as any, props: { boardId: t.boardId, cardId: t.cardId, tabId: t.tabId ?? "", sectionId: t.sectionId ?? "", label: t.label } },
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
