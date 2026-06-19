import { Block, defaultBlockSpecs } from "@blocknote/core";

const KNOWN_BLOCK_TYPES = new Set<string>([
  ...Object.keys(defaultBlockSpecs),
  "alert",
  "notebookMention",
]);

const KNOWN_INLINE_TYPES = new Set(["text", "link", "notebookMention"]);

type RawInline = Record<string, unknown>;

function normalizeTextNode(item: RawInline): RawInline | null {
  const text = typeof item.text === "string" ? item.text : "";
  if (text === "") return null;
  return { ...item, text, styles: (item.styles as object) ?? {} };
}

function migrateSingleInline(ic: unknown): RawInline | null {
  const item = ic as RawInline;
  const type = item.type as string | undefined;

  if (!type || type === "text") {
    return normalizeTextNode({ ...item, type: "text" });
  }

  if (type === "link") {
    const nested = Array.isArray(item.content)
      ? (item.content as unknown[]).flatMap((c) => {
          const norm = migrateSingleInline(c);
          return norm ? [norm] : [];
        })
      : [];
    if (nested.length === 0) return null;
    return { ...item, content: nested };
  }

  if (type === "notebookMention") {
    const props = (item.props as Record<string, unknown>) ?? {};
    if (!("boardId" in props)) {
      return { ...item, props: { boardId: "", ...props } };
    }
    return item;
  }

  if (!KNOWN_INLINE_TYPES.has(type)) return null;
  return item;
}

export function migrateInlineContent(content: unknown[]): unknown[] {
  return content.flatMap((ic) => {
    const norm = migrateSingleInline(ic);
    return norm ? [norm] : [];
  });
}

export function sanitizeBlocks(blocks: unknown[]): Block[] {
  const out: Block[] = [];
  for (const raw of blocks) {
    const block = raw as Block;
    if (!block || typeof block !== "object" || !KNOWN_BLOCK_TYPES.has(block.type as string)) continue;
    const sanitized: Block = {
      ...block,
      children: Array.isArray(block.children) ? sanitizeBlocks(block.children) : [],
    };
    if (Array.isArray(block.content)) {
      (sanitized as Record<string, unknown>).content = migrateInlineContent(block.content);
    }
    out.push(sanitized);
  }
  return out;
}
