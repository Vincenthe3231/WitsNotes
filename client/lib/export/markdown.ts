import { NotebookTab } from "@/lib/api/schemas";

type InlineContent = { type?: string; text?: string; styles?: Record<string, unknown> };
type Block = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: InlineContent[] | unknown;
  children?: Block[];
};

function inlineToMarkdown(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return (content as InlineContent[])
    .map((piece) => {
      if (piece.type && piece.type !== "text") return piece.text ?? "";
      let text = piece.text ?? "";
      const styles = piece.styles ?? {};
      if (styles.code) text = `\`${text}\``;
      if (styles.bold) text = `**${text}**`;
      if (styles.italic) text = `_${text}_`;
      if (styles.strike) text = `~~${text}~~`;
      return text;
    })
    .join("");
}

function blockToMarkdown(block: Block, indent = 0): string {
  const pad = "  ".repeat(indent);
  const text = inlineToMarkdown(block.content);

  let line: string;
  switch (block.type) {
    case "heading": {
      const level = Math.min(Math.max(Number(block.props?.level ?? 1), 1), 6);
      line = `${"#".repeat(level)} ${text}`;
      break;
    }
    case "bulletListItem":
      line = `${pad}- ${text}`;
      break;
    case "numberedListItem":
      line = `${pad}1. ${text}`;
      break;
    case "checkListItem":
      line = `${pad}- [${block.props?.checked ? "x" : " "}] ${text}`;
      break;
    case "alert":
      line = `> **${String(block.props?.level ?? "info").toUpperCase()}:** ${text}`;
      break;
    case "paragraph":
    default:
      line = text;
  }

  const childLines = (block.children ?? []).map((child) => blockToMarkdown(child, indent + 1));
  return [line, ...childLines].filter((l) => l.length > 0).join("\n");
}

/** Converts a single tab's blocks into a markdown string. */
export function tabToMarkdown(tab: NotebookTab): string {
  const body = (tab.blocks as Block[])
    .map((b) => blockToMarkdown(b))
    .filter((l) => l.length > 0)
    .join("\n\n");
  return `# ${tab.title}\n\n${body}`;
}

/** Converts a whole notebook (page tree) into one markdown document,
 * with nested pages rendered as increasingly-deep headings. */
export function notebookToMarkdown(title: string, tabs: NotebookTab[]): string {
  const sections: string[] = [`# ${title}`];
  function walk(nodes: NotebookTab[], depth: number) {
    for (const tab of nodes) {
      const headingLevel = Math.min(depth + 1, 6);
      const body = (tab.blocks as Block[])
        .map((b) => blockToMarkdown(b))
        .filter((l) => l.length > 0)
        .join("\n\n");
      sections.push(`${"#".repeat(headingLevel)} ${tab.title}\n\n${body}`.trim());
      if (tab.children?.length) walk(tab.children, depth + 1);
    }
  }
  walk(tabs, 1);
  return sections.filter((s) => s.length > 0).join("\n\n");
}
