import { describe, it, expect } from "vitest";
import { tabToMarkdown, notebookToMarkdown } from "./markdown";
import { NotebookTab } from "@/lib/api/schemas";

function tab(overrides: Partial<NotebookTab> & { blocks: unknown[] }): NotebookTab {
  return { id: "t1", title: "Page", ...overrides } as NotebookTab;
}

describe("tabToMarkdown", () => {
  it("renders a heading followed by a paragraph", () => {
    const t = tab({
      title: "My Page",
      blocks: [
        { type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Intro" }] },
        { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
      ],
    });
    const md = tabToMarkdown(t);
    expect(md).toContain("# My Page");
    expect(md).toContain("## Intro");
    expect(md).toContain("Hello world");
  });

  it("applies inline styles (bold, italic, code)", () => {
    const t = tab({
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", styles: { bold: true } },
            { type: "text", text: " and " },
            { type: "text", text: "code", styles: { code: true } },
          ],
        },
      ],
    });
    const md = tabToMarkdown(t);
    expect(md).toContain("**bold**");
    expect(md).toContain("`code`");
  });

  it("renders bullet, numbered, and check list items", () => {
    const t = tab({
      blocks: [
        { type: "bulletListItem", content: [{ type: "text", text: "bullet" }] },
        { type: "numberedListItem", content: [{ type: "text", text: "numbered" }] },
        { type: "checkListItem", props: { checked: true }, content: [{ type: "text", text: "done" }] },
        { type: "checkListItem", props: { checked: false }, content: [{ type: "text", text: "todo" }] },
      ],
    });
    const md = tabToMarkdown(t);
    expect(md).toContain("- bullet");
    expect(md).toContain("1. numbered");
    expect(md).toContain("- [x] done");
    expect(md).toContain("- [ ] todo");
  });

  it("renders an alert block as a blockquote with its level", () => {
    const t = tab({
      blocks: [{ type: "alert", props: { level: "warning" }, content: [{ type: "text", text: "Careful" }] }],
    });
    expect(tabToMarkdown(t)).toContain("> **WARNING:** Careful");
  });

  it("indents nested children", () => {
    const t = tab({
      blocks: [
        {
          type: "bulletListItem",
          content: [{ type: "text", text: "parent" }],
          children: [{ type: "bulletListItem", content: [{ type: "text", text: "child" }] }],
        },
      ],
    });
    const md = tabToMarkdown(t);
    expect(md).toContain("- parent");
    expect(md).toContain("  - child");
  });
});

describe("notebookToMarkdown", () => {
  it("renders nested pages as increasingly deep headings", () => {
    const tabs: NotebookTab[] = [
      {
        id: "p1",
        title: "Parent",
        blocks: [{ type: "paragraph", content: [{ type: "text", text: "top" }] }],
        children: [
          { id: "c1", title: "Child", blocks: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }] },
        ],
      },
    ];
    const md = notebookToMarkdown("My Notebook", tabs);
    expect(md).toContain("# My Notebook");
    expect(md).toContain("## Parent");
    expect(md).toContain("### Child");
    expect(md).toContain("nested");
  });
});
