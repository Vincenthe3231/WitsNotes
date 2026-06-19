"use client";

import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { useCommandStore } from "@/stores/commandStore";
import { useSearchCards } from "@/lib/api/hooks";
import { FileText, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const open = useCommandStore((s) => s.open);
  const setOpen = useCommandStore((s) => s.setOpen);
  const commands = useCommandStore((s) => s.commands);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"commands" | "search">("commands");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { data: searchResults, isFetching } = useSearchCards(searchQuery);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    if (!open) setTimeout(() => {
      setTab("commands");
      setSearchQuery("");
    }, 0);
  }, [open]);

  if (!open) return null;

  const grouped = new Map<string, typeof commands>();
  for (const [id, cmd] of commands) {
    const g = cmd.group ?? "General";
    if (!grouped.has(g)) grouped.set(g, new Map());
    grouped.get(g)!.set(id, cmd);
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    background: active ? "var(--color-primary)" : "transparent",
    color: active ? "var(--color-primary-fg)" : "var(--color-text-muted)",
    transition: "all 120ms",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--color-surface-glass)",
          backdropFilter: "blur(24px)",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Command palette"
      >
        {/* Tab switcher */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <button style={tabStyle(tab === "commands")} onClick={() => setTab("commands")}>Commands</button>
          <button style={tabStyle(tab === "search")} onClick={() => setTab("search")}>Search</button>
          <kbd className="ml-auto text-xs px-2 py-1 rounded" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>ESC</kbd>
        </div>

        {tab === "commands" && (
          <Command>
            <div className="flex items-center px-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <Command.Input
                ref={inputRef}
                placeholder="Search commands…"
                className="flex-1 py-3 text-sm bg-transparent outline-none"
                style={{ color: "var(--color-text)" }}
              />
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                No commands found.
              </Command.Empty>
              {[...grouped.entries()].map(([group, cmds]) => (
                <Command.Group key={group}>
                  <p className="px-3 py-1 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{group}</p>
                  {[...cmds.values()].map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.label}
                      onSelect={() => { cmd.action(); setOpen(false); }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm"
                      style={{ color: "var(--color-text)" }}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        )}

        {tab === "search" && (
          <div>
            <div className="flex items-center gap-2 px-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <Search size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, handwriting & text…"
                className="flex-1 py-3 text-sm bg-transparent outline-none"
                style={{ color: "var(--color-text)" }}
              />
              {isFetching && <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>…</span>}
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {!searchQuery && (
                <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Type to search cards…</p>
              )}
              {searchQuery && !isFetching && !searchResults?.length && (
                <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>No results.</p>
              )}
              {searchResults?.map((card) => (
                <button
                  key={card.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left cursor-pointer"
                  style={{ color: "var(--color-text)" }}
                  onClick={() => {
                    router.push(`/board/${card.board_id}`);
                    setOpen(false);
                  }}
                >
                  <FileText size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                  <span className="truncate">{card.title ?? card.content_text?.slice(0, 60) ?? "Untitled"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
