export interface TableContent {
  rows: number;
  cols: number;
  cells: string[][];
}

export function createTable(rows = 3, cols = 3): TableContent {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => "")),
  };
}

export function setCell(table: TableContent, row: number, col: number, value: string): TableContent {
  const cells = table.cells.map((r) => [...r]);
  cells[row][col] = value;
  return { ...table, cells };
}

export function addRow(table: TableContent): TableContent {
  return {
    ...table,
    rows: table.rows + 1,
    cells: [...table.cells, Array.from({ length: table.cols }, () => "")],
  };
}

export function addColumn(table: TableContent): TableContent {
  return {
    ...table,
    cols: table.cols + 1,
    cells: table.cells.map((r) => [...r, ""]),
  };
}

export function removeRow(table: TableContent, row: number): TableContent {
  if (table.rows <= 1) return table;
  return {
    ...table,
    rows: table.rows - 1,
    cells: table.cells.filter((_, i) => i !== row),
  };
}

export function removeColumn(table: TableContent, col: number): TableContent {
  if (table.cols <= 1) return table;
  return {
    ...table,
    cols: table.cols - 1,
    cells: table.cells.map((r) => r.filter((_, i) => i !== col)),
  };
}

/** Flattens the grid into plain text for search indexing (content_text). */
export function tableToText(table: TableContent): string {
  return table.cells.map((row) => row.join(" ")).join(" ");
}
