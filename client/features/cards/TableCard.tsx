"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useUpdateCard } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";
import { createTable, setCell, addRow, addColumn, removeRow, removeColumn, tableToText, TableContent } from "@/lib/canvas/table";

interface Props {
  card: Card;
  boardId: string;
}

function parseTable(content: Record<string, unknown> | null): TableContent {
  const c = content as Partial<TableContent> | null;
  if (c?.cells && c?.rows && c?.cols) return c as TableContent;
  return createTable();
}

export function TableCard({ card, boardId }: Props) {
  const { mutate: updateCard } = useUpdateCard();
  const [table, setTable] = useState<TableContent>(() => parseTable(card.content));

  function persist(next: TableContent) {
    setTable(next);
    updateCard({
      boardId,
      id: card.id,
      input: { content: next as unknown as Record<string, unknown>, content_text: tableToText(next) },
    });
  }

  return (
    <div
      className="glass-card h-full flex flex-col rounded-xl overflow-auto p-2"
      style={{ background: "var(--color-surface)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {table.cells.map((row, r) => (
            <tr key={r}>
              {row.map((value, c) => (
                <td key={c} style={{ border: "1px solid var(--color-border)", padding: 0 }}>
                  <input
                    value={value}
                    onChange={(e) => setTable((t) => setCell(t, r, c, e.target.value))}
                    onBlur={() => persist(table)}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="text-xs w-full outline-none"
                    style={{ background: "transparent", border: "none", color: "var(--color-text)", padding: "4px 6px", minWidth: 60 }}
                  />
                </td>
              ))}
              <td style={{ border: "none", padding: "0 2px" }}>
                <button
                  onClick={() => persist(removeRow(table, r))}
                  aria-label="Remove row"
                  className="cursor-pointer flex items-center justify-center"
                  style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", opacity: 0.5 }}
                >
                  <Minus size={11} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-2 mt-1 px-1">
        <button
          onClick={() => persist(addRow(table))}
          className="flex items-center gap-1 text-xs cursor-pointer"
          style={{ color: "var(--color-primary)", background: "transparent", border: "none" }}
        >
          <Plus size={11} /> Row
        </button>
        <button
          onClick={() => persist(addColumn(table))}
          className="flex items-center gap-1 text-xs cursor-pointer"
          style={{ color: "var(--color-primary)", background: "transparent", border: "none" }}
        >
          <Plus size={11} /> Column
        </button>
        {table.cols > 1 && (
          <button
            onClick={() => persist(removeColumn(table, table.cols - 1))}
            className="flex items-center gap-1 text-xs cursor-pointer"
            style={{ color: "var(--color-text-muted)", background: "transparent", border: "none" }}
          >
            <Minus size={11} /> Column
          </button>
        )}
      </div>
    </div>
  );
}
