"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBoard, useSetBoardVault } from "@/lib/api/hooks";
import { useCommandStore } from "@/stores/commandStore";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { InfiniteCanvas } from "@/features/canvas/InfiniteCanvas";
import { Topbar } from "@/components/layout/Topbar";
import { PasswordModal } from "@/components/ui/PasswordModal";
import { SetPasswordModal } from "@/components/ui/SetPasswordModal";
import {
  deriveKey, generateSalt, makeVerifier, checkVerifier,
  cacheKey, getCachedKey, boardVaultScope, lockAllForBoard,
} from "@/lib/crypto/notebook";

const VAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

interface Props {
  boardId: string;
}

export function BoardCanvas({ boardId }: Props) {
  useAuthGuard();
  const router = useRouter();
  const { data, isLoading, isError } = useBoard(boardId);
  const register = useCommandStore((s) => s.register);
  const unregister = useCommandStore((s) => s.unregister);
  const setOpen = useCommandStore((s) => s.setOpen);
  const { mutateAsync: setBoardVaultAsync } = useSetBoardVault(boardId);

  const [showSetPassword, setShowSetPassword] = useState(false);
  // Bumped after any unlock/lock action to force the sessionStorage-derived
  // unlock check below to re-run (sessionStorage isn't itself reactive).
  const [vaultVersion, setVaultVersion] = useState(0);

  const notebookCardIds = useMemo(
    () => (data?.cards ?? []).filter((c) => c.type === "notebook").map((c) => c.id),
    [data?.cards]
  );

  const unlocked = useMemo(() => {
    if (!data) return true;
    return !data.is_vault || getCachedKey(boardVaultScope(data.id)) !== null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id, data?.is_vault, vaultVersion]);

  const lockNow = useCallback(() => {
    if (!data) return;
    lockAllForBoard(data.id, notebookCardIds);
    setVaultVersion((v) => v + 1);
  }, [data, notebookCardIds]);

  useIdleTimer(VAULT_IDLE_TIMEOUT_MS, lockNow, Boolean(data?.is_vault) && unlocked);

  async function handleUnlockSubmit(password: string): Promise<boolean> {
    if (!data?.vault_salt || !data?.vault_verifier) return false;
    const key = await deriveKey(password, data.vault_salt);
    const ok = await checkVerifier(key, data.vault_verifier);
    if (ok) {
      cacheKey(boardVaultScope(data.id), key);
      setVaultVersion((v) => v + 1);
    }
    return ok;
  }

  async function handleEnableVault(password: string) {
    const salt = await generateSalt();
    const key = await deriveKey(password, salt);
    const verifier = await makeVerifier(key);
    await setBoardVaultAsync({ vaultSalt: salt, vaultVerifier: verifier });
    cacheKey(boardVaultScope(boardId), key);
    setVaultVersion((v) => v + 1);
    setShowSetPassword(false);
  }

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

  const isOwner = data.my_role === "owner" || data.my_role == null;
  const locked = data.is_vault && !unlocked;

  return (
    <>
      <Topbar
        title={data.title}
        board={data}
        vaultUnlocked={unlocked}
        onEnableVault={isOwner ? () => setShowSetPassword(true) : undefined}
        onLockNow={isOwner ? lockNow : undefined}
      />
      <main
        className="flex-1 relative overflow-hidden flex"
        style={{ background: "linear-gradient(135deg, var(--color-canvas-from), var(--color-canvas-to))" }}
      >
        {locked ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
              This board is locked.
            </p>
          </div>
        ) : (
          <InfiniteCanvas cards={data.cards} boardId={boardId} board={data} />
        )}
      </main>

      {locked && (
        <PasswordModal onSubmit={handleUnlockSubmit} onCancel={() => router.push("/")} />
      )}

      {showSetPassword && (
        <SetPasswordModal
          onSubmit={handleEnableVault}
          onCancel={() => setShowSetPassword(false)}
        />
      )}
    </>
  );
}
