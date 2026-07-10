import { describe, it, expect } from "vitest";
import { createTable, setCell, addRow, addColumn, removeRow, removeColumn, tableToText } from "./table";

describe("createTable", () => {
  it("creates an empty grid of the given dimensions", () => {
    const t = createTable(2, 3);
    expect(t.rows).toBe(2);
    expect(t.cols).toBe(3);
    expect(t.cells).toEqual([["", "", ""], ["", "", ""]]);
  });
});

describe("setCell", () => {
  it("updates a single cell without mutating the original", () => {
    const t = createTable(2, 2);
    const next = setCell(t, 0, 1, "hello");
    expect(next.cells[0][1]).toBe("hello");
    expect(t.cells[0][1]).toBe(""); // original untouched
  });
});

describe("addRow / addColumn", () => {
  it("adds a row of empty cells matching the column count", () => {
    const t = createTable(2, 3);
    const next = addRow(t);
    expect(next.rows).toBe(3);
    expect(next.cells).toHaveLength(3);
    expect(next.cells[2]).toEqual(["", "", ""]);
  });

  it("adds a column of empty cells to every row", () => {
    const t = createTable(2, 2);
    const next = addColumn(t);
    expect(next.cols).toBe(3);
    next.cells.forEach((row) => expect(row).toHaveLength(3));
  });
});

describe("removeRow / removeColumn", () => {
  it("removes the targeted row", () => {
    let t = createTable(3, 2);
    t = setCell(t, 1, 0, "keep-me-gone");
    const next = removeRow(t, 1);
    expect(next.rows).toBe(2);
    expect(next.cells.some((r) => r.includes("keep-me-gone"))).toBe(false);
  });

  it("refuses to remove the last row", () => {
    const t = createTable(1, 2);
    expect(removeRow(t, 0)).toEqual(t);
  });

  it("removes the targeted column", () => {
    let t = createTable(2, 3);
    t = setCell(t, 0, 1, "x");
    const next = removeColumn(t, 1);
    expect(next.cols).toBe(2);
    expect(next.cells[0]).not.toContain("x");
  });

  it("refuses to remove the last column", () => {
    const t = createTable(2, 1);
    expect(removeColumn(t, 0)).toEqual(t);
  });
});

describe("tableToText", () => {
  it("flattens all cells into a single space-joined string", () => {
    let t = createTable(2, 2);
    t = setCell(t, 0, 0, "a");
    t = setCell(t, 0, 1, "b");
    t = setCell(t, 1, 0, "c");
    expect(tableToText(t)).toBe("a b c ");
  });
});
