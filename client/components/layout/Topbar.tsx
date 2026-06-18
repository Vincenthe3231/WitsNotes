"use client";

import { Search, Bell, Moon, Sun, User } from "lucide-react";
import { useState, useEffect } from "react";

export function Topbar({ title }: { title?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleDark = () => {
    const html = document.documentElement;
    html.classList.toggle("dark");
    setDark((d) => !d);
  };

  return (
    <header
      className="glass flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]"
      style={{ zIndex: "var(--z-sidebar)", minHeight: 56 }}
      role="banner"
    >
      {/* Title */}
      <h1 className="flex-1 text-base font-semibold truncate" style={{ color: "var(--color-text)" }}>
        {title ?? "Boards"}
      </h1>

      {/* Search */}
      <button
        className="neu flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer transition-all duration-150"
        style={{ color: "var(--color-text-muted)", minWidth: 160 }}
        aria-label="Open search"
      >
        <Search size={15} />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-auto hidden sm:inline text-xs opacity-50">⌘K</kbd>
      </button>

      {/* Notifications */}
      <button
        className="neu rounded-xl p-2 cursor-pointer transition-all duration-150"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Notifications"
      >
        <Bell size={17} />
      </button>

      {/* Dark/light */}
      <button
        onClick={toggleDark}
        className="neu rounded-xl p-2 cursor-pointer transition-all duration-150"
        style={{ color: "var(--color-text-muted)" }}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* Avatar */}
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
