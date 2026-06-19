"use client";

import { Search, Bell, Moon, Sun, User } from "lucide-react";
import { useEffect } from "react";
import { useCommandStore } from "@/stores/commandStore";
import { useThemeMode } from "@/hooks/useThemeMode";

export function Topbar({ title }: { title?: string }) {
  const { dark, toggle: toggleDark } = useThemeMode();
  const togglePalette = useCommandStore((s) => s.toggle);
  const register = useCommandStore((s) => s.register);
  const unregister = useCommandStore((s) => s.unregister);

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

  return (
    <header
      className="glass flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]"
      style={{ zIndex: "var(--z-sidebar)", minHeight: 56 }}
      role="banner"
    >
      <h1 className="flex-1 text-base font-semibold truncate" style={{ color: "var(--color-text)" }}>
        {title ?? "Boards"}
      </h1>

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
  );
}
