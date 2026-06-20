import { Card, NotebookTab } from "@/lib/api/schemas";
import { Block } from "@blocknote/core";

/** Immutable helpers over a forest of NotebookTab pages (content.tabs). */

/** Generate a URL-friendly anchor ID for a heading block. */
export function generateAnchorId(blockId: string, title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
  const id = slug || blockId.slice(0, 8);
  return `section-${id}`;
}

/** Extract the anchor ID if the block is a heading, else return null. */
export function getBlockAnchor(block: Block): string | null {
  if (block.type === "heading" && typeof block.props === "object" && block.props !== null) {
    const props = block.props as Record<string, unknown>;
    const headingLevel = props.level ?? 1;
    const content = (block.content as Array<{ text?: string } | null> | null)?.[0]?.text ?? "";
    return generateAnchorId(block.id, content);
  }
  return null;
}

export function findNode(tree: NotebookTab[], id: string): NotebookTab | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function updateNode(
  tree: NotebookTab[],
  id: string,
  patch: Partial<NotebookTab>
): NotebookTab[] {
  return tree.map((node) => {
    if (node.id === id) return { ...node, ...patch };
    if (node.children) {
      return { ...node, children: updateNode(node.children, id, patch) };
    }
    return node;
  });
}

/** Insert a node as a child of parentId. parentId === null appends at root. */
export function insertChild(
  tree: NotebookTab[],
  parentId: string | null,
  node: NotebookTab
): NotebookTab[] {
  if (parentId === null) return [...tree, node];
  return tree.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children ?? []), node] };
    }
    if (n.children) return { ...n, children: insertChild(n.children, parentId, node) };
    return n;
  });
}

export function removeNode(tree: NotebookTab[], id: string): NotebookTab[] {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}

/**
 * Move a node to be a child of toParentId at the given index.
 * toParentId === null moves to root. Re-parenting a node into its own subtree
 * is a no-op (guards against cycles).
 */
export function moveNode(
  tree: NotebookTab[],
  fromId: string,
  toParentId: string | null,
  index: number
): NotebookTab[] {
  const moving = findNode(tree, fromId);
  if (!moving) return tree;
  if (toParentId !== null && (toParentId === fromId || findNode(moving.children ?? [], toParentId))) {
    return tree;
  }

  const without = removeNode(tree, fromId);

  if (toParentId === null) {
    const next = [...without];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, moving);
    return next;
  }

  return without.map(function insertAt(n: NotebookTab): NotebookTab {
    if (n.id === toParentId) {
      const children = [...(n.children ?? [])];
      children.splice(Math.max(0, Math.min(index, children.length)), 0, moving);
      return { ...n, children };
    }
    return n.children ? { ...n, children: n.children.map(insertAt) } : n;
  });
}

/** Depth-first flatten of all nodes (for counts / search / first-leaf). */
export function flatten(tree: NotebookTab[]): NotebookTab[] {
  const out: NotebookTab[] = [];
  for (const node of tree) {
    out.push(node);
    if (node.children) out.push(...flatten(node.children));
  }
  return out;
}

/** First node in document order — the default page to open. */
export function firstLeaf(tree: NotebookTab[]): NotebookTab | null {
  return tree[0] ?? null;
}

export type MentionTarget = {
  id: string;
  boardId: string;
  cardId: string;
  tabId?: string;
  sectionId?: string;
  label: string;
  path: string;
};

function walkTabs(
  tabs: NotebookTab[],
  boardId: string,
  cardId: string,
  notebookTitle: string,
  breadcrumb: string[],
  out: MentionTarget[]
) {
  for (const tab of tabs) {
    const crumbs = [...breadcrumb, tab.title];
    const path = [notebookTitle, ...crumbs].join(" › ");
    out.push({ id: `${cardId}:${tab.id}`, boardId, cardId, tabId: tab.id, label: crumbs.join(" › "), path });

    // Extract headings from the tab's blocks as mention targets
    if (tab.blocks?.length) {
      const headings = extractHeadingsFromBlocks(tab.blocks);
      for (const heading of headings) {
        const sectionLabel = `${heading.text}`;
        const sectionPath = [...crumbs, sectionLabel].join(" › ");
        out.push({
          id: `${cardId}:${tab.id}#${heading.anchor}`,
          boardId,
          cardId,
          tabId: tab.id,
          sectionId: heading.anchor,
          label: `${crumbs.join(" › ")} › ${sectionLabel}`,
          path: sectionPath,
        });
      }
    }

    if (tab.children?.length) walkTabs(tab.children, boardId, cardId, notebookTitle, crumbs, out);
  }
}

/** Extract headings from a blocks array, returning text and anchor for each. */
function extractHeadingsFromBlocks(blocks: unknown[]): Array<{ text: string; anchor: string }> {
  const headings: Array<{ text: string; anchor: string }> = [];
  for (const block of blocks) {
    if (block && typeof block === "object") {
      const b = block as Record<string, unknown>;
      if (b.type === "heading") {
        const content = (b.content as Array<{ text?: string } | null> | null)?.[0]?.text ?? "";
        if (content) {
          const anchor = generateAnchorId(b.id as string, content);
          headings.push({ text: content, anchor });
        }
      }
    }
  }
  return headings;
}

export function flattenTabsForMention(cards: Card[]): MentionTarget[] {
  const out: MentionTarget[] = [];
  for (const card of cards) {
    if (card.type !== "notebook") continue;
    const notebookTitle = card.title ?? "Notebook";
    out.push({ id: card.id, boardId: card.board_id, cardId: card.id, label: notebookTitle, path: notebookTitle });
    const tabs = (card.content as { tabs?: NotebookTab[] } | null)?.tabs ?? [];
    walkTabs(tabs, card.board_id, card.id, notebookTitle, [], out);
  }
  return out;
}

export type Backlink = {
  sourceCardId: string;
  sourceCardTitle?: string;
  sourceTabId: string;
  sourceTabTitle: string;
  blockId: string;
  mentionLabel: string;
  sectionId?: string;
};

/** Find all backlinks to a target card/tab/section. */
export function findBacklinks(
  cards: Card[],
  targetCardId: string,
  targetTabId?: string,
  targetSectionId?: string
): Backlink[] {
  const backlinks: Backlink[] = [];

  for (const card of cards) {
    if (card.type !== "notebook") continue;
    const tabs = (card.content as { tabs?: NotebookTab[] } | null)?.tabs ?? [];

    function walkTabsForBacklinks(
      tabList: NotebookTab[],
      currentCardId: string,
      currentCardTitle: string | undefined
    ) {
      for (const tab of tabList) {
        const blocks = tab.blocks || [];
        for (const block of blocks) {
          const b = block as Record<string, unknown>;
          const inlineContent = (b.content as Array<Record<string, unknown>> | null) || [];
          for (const inline of inlineContent) {
            if (inline.type === "notebookMention") {
              const props = inline.props as Record<string, unknown>;
              const refCardId = props.cardId;
              const refTabId = props.tabId;
              const refSectionId = props.sectionId;

              const matchesTarget =
                refCardId === targetCardId &&
                (!targetTabId || refTabId === targetTabId) &&
                (!targetSectionId || refSectionId === targetSectionId || (!refSectionId && !targetSectionId));

              if (matchesTarget) {
                backlinks.push({
                  sourceCardId: currentCardId,
                  sourceCardTitle: currentCardTitle,
                  sourceTabId: tab.id,
                  sourceTabTitle: tab.title,
                  blockId: b.id as string,
                  mentionLabel: (props.label as string) || "Untitled",
                  sectionId: refSectionId ? (refSectionId as string) : undefined,
                });
              }
            }
          }
        }

        if (tab.children) {
          walkTabsForBacklinks(tab.children, currentCardId, currentCardTitle);
        }
      }
    }

    walkTabsForBacklinks(tabs, card.id, card.title);
  }

  return backlinks;
}
