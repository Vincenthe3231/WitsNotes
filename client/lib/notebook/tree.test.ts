import { describe, it, expect } from "vitest";
import { flattenTabsForMention, findBacklinks, generateAnchorId } from "./tree";
import { Card, NotebookTab } from "@/lib/api/schemas";

function makeNotebookCard(overrides: Partial<Card> & { tabs: NotebookTab[] }): Card {
  const { tabs, ...rest } = overrides;
  return {
    id: "card-1",
    board_id: "board-1",
    created_by: 1,
    type: "notebook",
    title: "Notebook",
    x: 0,
    y: 0,
    w: 320,
    h: 200,
    z: 10,
    rotation: 0,
    style: null,
    content: { tabs },
    content_text: null,
    due_at: null,
    remind_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...rest,
  };
}

function mentionBlock(id: string, refCardId: string, refTabId: string, label: string, sectionId?: string) {
  return {
    id,
    type: "paragraph",
    content: [{ type: "notebookMention", props: { cardId: refCardId, tabId: refTabId, sectionId: sectionId ?? "", label } }],
  };
}

describe("flattenTabsForMention", () => {
  it("skips non-notebook cards", () => {
    const card = makeNotebookCard({ id: "c1", type: "todo" as Card["type"], tabs: [{ id: "t1", title: "Page", blocks: [] }] });
    expect(flattenTabsForMention([card])).toEqual([]);
  });

  it("includes the notebook card itself plus each tab as a mention target", () => {
    const card = makeNotebookCard({
      id: "c1",
      title: "My Notes",
      tabs: [{ id: "t1", title: "Page One", blocks: [] }],
    });
    const targets = flattenTabsForMention([card]);
    expect(targets.map((t) => t.label)).toEqual(["My Notes", "Page One"]);
    expect(targets[1]).toMatchObject({ cardId: "c1", tabId: "t1", boardId: "board-1" });
  });

  it("walks nested child tabs and builds breadcrumb paths", () => {
    const card = makeNotebookCard({
      id: "c1",
      title: "Notes",
      tabs: [{ id: "t1", title: "Parent", blocks: [], children: [{ id: "t2", title: "Child", blocks: [] }] }],
    });
    const targets = flattenTabsForMention([card]);
    const child = targets.find((t) => t.tabId === "t2");
    expect(child?.label).toBe("Parent › Child");
    expect(child?.path).toBe("Notes › Parent › Child");
  });

  it("extracts headings within a tab's blocks as separate mention targets", () => {
    const anchor = generateAnchorId("h1", "Intro");
    const card = makeNotebookCard({
      id: "c1",
      title: "Notes",
      tabs: [{ id: "t1", title: "Page", blocks: [{ id: "h1", type: "heading", content: [{ text: "Intro" }] }] }],
    });
    const targets = flattenTabsForMention([card]);
    const heading = targets.find((t) => t.sectionId === anchor);
    expect(heading).toBeDefined();
    expect(heading?.label).toBe("Page › Intro");
  });
});

describe("findBacklinks", () => {
  it("finds a card that @mentions the target card", () => {
    const target = makeNotebookCard({ id: "target", title: "Target Note", tabs: [{ id: "tt", title: "Main", blocks: [] }] });
    const source = makeNotebookCard({
      id: "source",
      title: "Source Note",
      tabs: [{ id: "st", title: "Page", blocks: [mentionBlock("b1", "target", "tt", "Target Note")] }],
    });

    const backlinks = findBacklinks([target, source], "target");

    expect(backlinks).toHaveLength(1);
    expect(backlinks[0]).toMatchObject({ sourceCardId: "source", sourceTabId: "st", mentionLabel: "Target Note" });
  });

  it("returns empty when no card mentions the target", () => {
    const target = makeNotebookCard({ id: "target", tabs: [{ id: "tt", title: "Main", blocks: [] }] });
    const other = makeNotebookCard({ id: "other", tabs: [{ id: "ot", title: "Page", blocks: [] }] });

    expect(findBacklinks([target, other], "target")).toHaveLength(0);
  });

  it("filters by tab id when targetTabId is given", () => {
    const source = makeNotebookCard({
      id: "source",
      tabs: [{
        id: "st", title: "Page", blocks: [
          mentionBlock("b1", "target", "tab-a", "A"),
          mentionBlock("b2", "target", "tab-b", "B"),
        ],
      }],
    });

    const onlyA = findBacklinks([source], "target", "tab-a");
    expect(onlyA).toHaveLength(1);
    expect(onlyA[0].mentionLabel).toBe("A");
  });

  it("finds mentions nested in child tabs", () => {
    const source = makeNotebookCard({
      id: "source",
      tabs: [{
        id: "parent", title: "Parent", blocks: [],
        children: [{ id: "child", title: "Child", blocks: [mentionBlock("b1", "target", "tt", "Target")] }],
      }],
    });

    const backlinks = findBacklinks([source], "target");
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0].sourceTabId).toBe("child");
  });

  it("ignores non-notebook cards entirely", () => {
    const todo = makeNotebookCard({ id: "t1", type: "todo" as Card["type"], tabs: [] });
    expect(findBacklinks([todo], "target")).toHaveLength(0);
  });
});
