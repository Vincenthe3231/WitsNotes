"use client";

import { Search, Bell, Moon, Sun, User, Share2, Users, Lock, LockOpen, Download, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";
import { useCommandStore } from "@/stores/commandStore";
import { useThemeMode } from "@/hooks/useThemeMode";
import { SyncStatus } from "@/components/ui/SyncStatus";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { ShareModal } from "@/components/ui/ShareModal";
import { useBoardMembers } from "@/lib/api/hooks";
import type { Board } from "@/lib/api/schemas";

// Deterministic per-user avatar color (matches PresenceLayer)
function userColor(userId: number | string): string {
  const colors = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981",
    "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
  ];
  const hash = String(userId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function AvatarStack({ boardId }: { boardId: string }) {
  const { data: members = [] } = useBoardMembers(boardId);
  const visible = members.slice(0, 4);
  const overflow = members.length - 4;

  if (members.length === 0) return null;

  return (
    <div className="flex items-center" style={{ gap: 0 }} aria-label="Board members">
      {visible.map((m, i) => (
        <div
          key={m.id ?? `owner-${m.user_id}`}
          title={`${m.name} (${m.role})`}
          className="flex items-center justify-center rounded-full text-xs font-bold border-2 border-[var(--color-surface)]"
          style={{
            width: 28,
            height: 28,
            background: userColor(m.user_id),
            color: "#fff",
            marginLeft: i === 0 ? 0 : -8,
            zIndex: visible.length - i,
            position: "relative",
            flexShrink: 0,
          }}
        >
          {m.name.slice(0, 2).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full text-xs font-bold border-2 border-[var(--color-surface)]"
          style={{
            width: 28, height: 28,
            background: "var(--color-surface)",
            color: "var(--color-text-muted)",
            marginLeft: -8,
            flexShrink: 0,
          }}
          aria-label={`${overflow} more members`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

interface TopbarProps {
  title?: string;
  board?: Board | null;
  vaultUnlocked?: boolean;
  onEnableVault?: () => void;
  onLockNow?: () => void;
  onExportPng?: () => void;
  onExportPdf?: () => void;
  onArrangeMoodboard?: () => void;
}

export function Topbar({ title, board, vaultUnlocked, onEnableVault, onLockNow, onExportPng, onExportPdf, onArrangeMoodboard }: TopbarProps) {
  const { dark, toggle: toggleDark } = useThemeMode();
  const togglePalette = useCommandStore((s) => s.toggle);
  const register = useCommandStore((s) => s.register);
  const unregister = useCommandStore((s) => s.unregister);
  const [showShare, setShowShare] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    const cmd = {
      id: "theme.toggle",
      label: "Toggle dark / light mode",
      shortcut: "⌘⇧L",
      group: "Appearance",
      action: toggleDark,
    };
    register(cmd);
    return () => unregister(cmd.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  const isOwner = board?.my_role === "owner" || board?.my_role == null;

  return (
    <>
      <header
        className="glass flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]"
        style={{ zIndex: "var(--z-sidebar)", minHeight: 56 }}
        role="banner"
      >
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <h1 className="text-base font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {title ?? "Boards"}
          </h1>

          {/* Shared pill + role chip (board context only) */}
          {board && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {board.has_members && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: "var(--color-primary)", color: "#fff" }}>
                  <Users size={11} />
                  <span>Shared</span>
                </div>
              )}
              {!isOwner && (
                <div className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>
                  {board.my_role === "editor" ? "Editor" : "Viewer"}
                </div>
              )}
            </div>
          )}
        </div>

        <SyncStatus />
        <InstallPrompt />

        {/* Collaboration avatar stack */}
        {board?.has_members && <AvatarStack boardId={board.id} />}

        {/* Vault lock controls — owner only, not on shared boards */}
        {board && isOwner && !board.has_members && !board.is_vault && onEnableVault && (
          <button
            onClick={onEnableVault}
            className="neu flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm cursor-pointer transition-all duration-150"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Lock board"
            title="Set a password to lock this board"
          >
            <LockOpen size={14} />
            <span className="hidden sm:inline">Lock board</span>
          </button>
        )}
        {board && isOwner && board.is_vault && vaultUnlocked && onLockNow && (
          <button
            onClick={onLockNow}
            className="neu flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm cursor-pointer transition-all duration-150"
            style={{ color: "var(--color-primary)" }}
            aria-label="Lock now"
            title="Re-lock this board immediately"
          >
            <Lock size={14} />
            <span className="hidden sm:inline">Lock now</span>
          </button>
        )}

        {/* Export menu */}
        {board && (onExportPng || onExportPdf) && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="neu flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm cursor-pointer transition-all duration-150"
              style={{ color: "var(--color-text-muted)" }}
              aria-label="Export board"
              aria-expanded={showExportMenu}
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
            {showExportMenu && (
              <div
                role="menu"
                className="absolute right-0 mt-1 rounded-xl overflow-hidden"
                style={{ top: "100%", background: "var(--color-surface-glass)", backdropFilter: "blur(20px)", border: "1px solid var(--color-border)", zIndex: 50, minWidth: 140 }}
              >
                {onExportPng && (
                  <button
                    role="menuitem"
                    onClick={() => { setShowExportMenu(false); onExportPng(); }}
                    className="w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors duration-150"
                    style={{ color: "var(--color-text)", background: "transparent" }}
                  >
                    Export as PNG
                  </button>
                )}
                {onExportPdf && (
                  <button
                    role="menuitem"
                    onClick={() => { setShowExportMenu(false); onExportPdf(); }}
                    className="w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors duration-150"
                    style={{ color: "var(--color-text)", background: "transparent" }}
                  >
                    Export as PDF
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Moodboard arrange — one-shot dense image-grid layout */}
        {board && onArrangeMoodboard && (
          <button
            onClick={onArrangeMoodboard}
            className="neu flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm cursor-pointer transition-all duration-150"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Arrange as moodboard"
            title="Arrange all cards into a dense grid"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Moodboard</span>
          </button>
        )}

        {/* Share button — owner only */}
        {board && isOwner && (
          <button
            onClick={() => setShowShare(true)}
            className="neu flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm cursor-pointer transition-all duration-150"
            style={{ color: "var(--color-primary)" }}
            aria-label="Share board"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        <button
          onClick={togglePalette}
          className="neu flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer transition-all duration-150"
          style={{ color: "var(--color-text-muted)", minWidth: 160 }}
          aria-label="Open search"
        >
          <Search size={15} />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="ml-auto hidden sm:inline text-xs opacity-50">⌘K</kbd>
        </button>

        <button
          className="neu rounded-xl p-2 cursor-pointer transition-all duration-150"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Notifications"
        >
          <Bell size={17} />
        </button>

        <button
          onClick={toggleDark}
          className="neu rounded-xl p-2 cursor-pointer transition-all duration-150"
          style={{ color: "var(--color-text-muted)" }}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          className="neu rounded-xl p-2 cursor-pointer transition-all duration-150"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="User account"
        >
          <User size={17} />
        </button>
      </header>

      {showShare && board && (
        <ShareModal
          boardId={board.id}
          isVault={board.is_vault}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
