import { Card, NotebookTab } from "@/lib/api/schemas";

/** Immutable helpers over a forest of NotebookTab pages (content.tabs). */

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
    if (tab.children?.length) walkTabs(tab.children, boardId, cardId, notebookTitle, crumbs, out);
  }
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
