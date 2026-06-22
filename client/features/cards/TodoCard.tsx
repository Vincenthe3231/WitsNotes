"use client";

import { useState } from "react";
import { useUpdateCard } from "@/lib/api/hooks";
import { Card } from "@/lib/api/schemas";
import { CheckSquare, Square, Plus } from "lucide-react";

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface Props {
  card: Card;
  boardId: string;
}

function parseTodos(content: Record<string, unknown> | null): TodoItem[] {
  if (!content || !Array.isArray(content.items)) return [];
  return content.items as TodoItem[];
}

export function TodoCard({ card, boardId }: Props) {
  const { mutate: updateCard } = useUpdateCard();
  const [todos, setTodos] = useState<TodoItem[]>(() => parseTodos(card.content));
  const [newText, setNewText] = useState("");

  function save(next: TodoItem[]) {
    setTodos(next);
    updateCard({ boardId, id: card.id, input: { content: { items: next }, content_text: next.map((t) => t.text).join("\n") } });
  }

  function toggle(id: string) {
    save(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function addItem() {
    if (!newText.trim()) return;
    save([...todos, { id: crypto.randomUUID(), text: newText.trim(), done: false }]);
    setNewText("");
  }

  return (
    <div
      className="glass-card h-full flex flex-col rounded-xl overflow-hidden p-3 gap-2"
      style={{ background: "var(--color-surface)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        {card.type === "task" ? "Task" : "To-do"}
      </p>
      <ul className="flex-1 overflow-y-auto flex flex-col gap-1">
        {todos.map((t) => (
          <li key={t.id} className="flex items-start gap-2 cursor-pointer" onClick={() => toggle(t.id)}>
            {t.done
              ? <CheckSquare size={16} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }} />
              : <Square size={16} style={{ color: "var(--color-text-muted)", flexShrink: 0, marginTop: 2 }} />}
            <span className="text-sm" style={{ color: "var(--color-text)", textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1 }}>
              {t.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex gap-1 mt-1">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add item…"
          className="flex-1 text-sm px-2 py-1 rounded-lg border outline-none"
          style={{ background: "transparent", borderColor: "var(--color-border)", color: "var(--color-text)" }}
        />
        <button onClick={addItem} className="cursor-pointer p-1 rounded-lg" style={{ color: "var(--color-primary)" }} aria-label="Add">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
