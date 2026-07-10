"use client";

import { useEffect } from "react";
import { useBoard } from "@/lib/api/hooks";
import { useCommandStore } from "@/stores/commandStore";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { InfiniteCanvas } from "@/features/canvas/InfiniteCanvas";
import { Topbar } from "@/components/layout/Topbar";

interface Props {
  boardId: string;
}

export function BoardCanvas({ boardId }: Props) {
  useAuthGuard();
  const { data, isLoading, isError } = useBoard(boardId);
  const register = useCommandStore((s) => s.register);
  const unregister = useCommandStore((s) => s.unregister);
  const setOpen = useCommandStore((s) => s.setOpen);

  useEffect(() => {
    const cmds = [
      {
        id: "board.open-palette",
        label: "Open command palette",
        shortcut: "⌘K",
        group: "Navigation",
        action: () => setOpen(true),
      },
      {
        id: "board.zoom-reset",
        label: "Reset zoom",
        shortcut: "⌘0",
        group: "Canvas",
        action: () => {},
      },
    ];
    cmds.forEach(register);
    return () => cmds.forEach((c) => unregister(c.id));
  }, [register, unregister, setOpen]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-canvas-from), var(--color-canvas-to))" }}>
        <p style={{ color: "var(--color-text-muted)" }} className="text-sm">Loading board…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-canvas-from), var(--color-canvas-to))" }}>
        <p className="text-sm text-red-500">Failed to load board.</p>
      </div>
    );
  }

  return (
    <>
      <Topbar title={data.title} board={data} />
      <main
        className="flex-1 relative overflow-hidden flex"
        style={{ background: "linear-gradient(135deg, var(--color-canvas-from), var(--color-canvas-to))" }}
      >
        <InfiniteCanvas cards={data.cards} boardId={boardId} board={data} />
      </main>
    </>
  );
}
