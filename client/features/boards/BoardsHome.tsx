"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBoards, useCreateBoard, useDeleteBoard } from "@/lib/api/hooks";
import { Plus, Trash2, Layout, Users } from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export function BoardsHome() {
  useAuthGuard();
  const router = useRouter();
  const { data: boards, isLoading } = useBoards();
  const { mutate: createBoard, isPending: creating } = useCreateBoard();
  const { mutate: deleteBoard } = useDeleteBoard();
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  function handleCreate() {
    if (!newTitle.trim()) return;
    createBoard(
      { title: newTitle.trim() },
      {
        onSuccess: (board) => {
          setNewTitle("");
          setShowCreate(false);
          router.push(`/board/${board.id}`);
        },
      }
    );
  }

  if (isLoading) {
    return <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading boards…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Your Boards</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-150"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          <Plus size={16} />
          New Board
        </button>
      </div>

      {showCreate && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
            placeholder="Board title…"
            className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            {creating ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => setShowCreate(false)}
            className="px-4 py-2 rounded-xl text-sm cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >Cancel</button>
        </div>
      )}

      {!boards?.length && !showCreate && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Layout size={48} style={{ color: "var(--color-text-muted)", opacity: 0.4 }} />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No boards yet. Create your first board to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards?.map((board) => {
          const isOwner = board.my_role === "owner" || board.my_role == null;
          const isShared = board.has_members;
          return (
            <div
              key={board.id}
              className="group glass-card relative rounded-2xl p-5 cursor-pointer transition-all duration-150 hover:scale-[1.02] flex flex-col"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
              onClick={() => router.push(`/board/${board.id}`)}
            >
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1 truncate" style={{ color: "var(--color-text)" }}>{board.title}</h3>
                {board.description && (
                  <p className="text-sm truncate" style={{ color: "var(--color-text-muted)" }}>{board.description}</p>
                )}
              </div>

              {/* Footer badges */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {isShared && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: "var(--color-primary)", color: "#fff" }}>
                    <Users size={12} />
                    <span>Shared</span>
                  </div>
                )}
                {!isOwner && (
                  <div className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>
                    {board.my_role === "editor" ? "Editor" : "Viewer"}
                  </div>
                )}
              </div>

              {/* Delete button — owner only */}
              {isOwner && (
                <button
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg cursor-pointer transition-opacity duration-150"
                  style={{ color: "var(--color-text-muted)" }}
                  onClick={(e) => { e.stopPropagation(); deleteBoard(board.id); }}
                  aria-label="Delete board"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
