"use client";

import {
  LayoutDashboard,
  StickyNote,
  CheckSquare,
  BookMarked,
  Search,
  Settings,
  ChevronLeft,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Boards", href: "/" },
  { icon: StickyNote, label: "Notes", href: "/notes" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BookMarked, label: "Bookmarks", href: "/bookmarks" },
  { icon: Search, label: "Search", href: "/search" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="glass flex flex-col transition-[width] duration-300 ease-in-out shrink-0"
      style={{
        width: collapsed ? 64 : 240,
        zIndex: "var(--z-sidebar)",
        borderRight: "1px solid var(--glass-border)",
      }}
      aria-label="Main navigation"
    >
      {/* Logo / collapse toggle */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--glass-border)]">
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--color-primary)" }}>
            WitsNote
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="neu rounded-lg p-1.5 cursor-pointer transition-transform duration-200"
          style={{ marginLeft: collapsed ? "auto" : 0, color: "var(--color-text-muted)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            size={16}
            style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
          />
        </button>
      </div>

      {/* New board button */}
      <div className="px-3 py-3">
        <button
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150 font-medium text-sm"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-fg)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
          aria-label="Create new board"
        >
          <Plus size={16} />
          {!collapsed && <span>New Board</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer"
            style={{
              color: "var(--color-text-muted)",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-2 py-3 border-t border-[var(--glass-border)]">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer"
          style={{
            color: "var(--color-text-muted)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
