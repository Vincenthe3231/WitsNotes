"use client";

import { useRef, useState } from "react";
<<<<<<< HEAD
import { ChevronRight, FileText, Plus, Trash2, PanelLeftClose } from "lucide-react";
import { NotebookTab } from "@/lib/api/schemas";
=======
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, FileText, Plus, Trash2, PanelLeftClose, Link2 } from "lucide-react";
import { NotebookTab } from "@/lib/api/schemas";
import { type Backlink } from "@/lib/notebook/tree";
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad

interface Props {
  tabs: NotebookTab[];
  activeId: string;
  title?: string;
  onSelect: (id: string) => void;
  /** Add a child page under parentId; null = root level. */
  onAdd: (parentId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  /** Move `fromId` under `toParentId` (null = root) at `index`. */
  onMove: (fromId: string, toParentId: string | null, index: number) => void;
  onCollapseSidebar: () => void;
<<<<<<< HEAD
=======
  backlinks?: Backlink[];
  currentCardId?: string;
  currentTabId?: string;
  boardId?: string;
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
}

const ROW_PAD = 8;
const INDENT = 14;

export function NotebookSidebar({
  tabs, activeId, title, onSelect, onAdd, onRename, onDelete, onMove, onCollapseSidebar,
<<<<<<< HEAD
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const dragId = useRef<string | null>(null);

=======
  backlinks,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showBacklinks, setShowBacklinks] = useState(false);
  const dragId = useRef<string | null>(null);

  function handleSelectTab(id: string) {
    onSelect(id);
    const params = new URLSearchParams(searchParams);
    params.set("tab", id);
    router.push(`?${params.toString()}`);
  }

  function handleBacklinkClick(backlink: Backlink) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", backlink.sourceTabId);
    router.push(`?${params.toString()}${backlink.sectionId ? `#${backlink.sectionId}` : ""}`);
    // Scroll to the mention block
    setTimeout(() => {
      const element = document.getElementById(`block-${backlink.blockId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Add a brief highlight
      if (element) {
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = "rgba(255,200,0,0.3)";
        setTimeout(() => {
          element.style.backgroundColor = originalBg;
        }, 2000);
      }
    }, 100);
  }

>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function finishRename(id: string) {
    if (draft.trim()) onRename(id, draft.trim());
    setEditingId(null);
  }

  function renderNode(node: NotebookTab, depth: number): React.ReactNode {
    const isActive = node.id === activeId;
    const hasChildren = !!node.children?.length;
    const isCollapsed = collapsed.has(node.id);

    return (
      <div key={node.id}>
        <div
          role="treeitem"
          aria-selected={isActive}
          aria-expanded={hasChildren ? !isCollapsed : undefined}
          tabIndex={0}
          draggable
          onDragStart={(e) => { dragId.current = node.id; e.stopPropagation(); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragId.current && dragId.current !== node.id) {
              // Drop onto a row → become its first child.
              onMove(dragId.current, node.id, 0);
            }
            dragId.current = null;
          }}
<<<<<<< HEAD
          onClick={() => onSelect(node.id)}
=======
          onClick={() => handleSelectTab(node.id)}
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
          onKeyDown={(e) => {
            if (e.key === "Enter") onSelect(node.id);
            if (e.key === "ArrowRight" && hasChildren && isCollapsed) toggleCollapse(node.id);
            if (e.key === "ArrowLeft" && hasChildren && !isCollapsed) toggleCollapse(node.id);
          }}
          className="group flex items-center gap-1 cursor-pointer transition-colors duration-150"
          style={{
            paddingLeft: ROW_PAD + depth * INDENT,
            paddingRight: 6,
            height: 30,
            borderRadius: 8,
            background: isActive ? "var(--nb-row-active)" : "transparent",
            boxShadow: isActive ? "inset 2px 0 0 var(--color-primary)" : "none",
            color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
            fontSize: 13,
            userSelect: "none",
          }}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nb-row-hover)"; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleCollapse(node.id); }}
            tabIndex={-1}
            aria-label={hasChildren ? (isCollapsed ? "Expand" : "Collapse") : undefined}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 16, height: 16, border: "none", background: "transparent",
              cursor: hasChildren ? "pointer" : "default", flexShrink: 0,
              color: "var(--nb-page-icon)", opacity: hasChildren ? 1 : 0,
            }}
          >
            <ChevronRight
              size={13}
              style={{ transition: "transform 150ms", transform: isCollapsed ? "none" : "rotate(90deg)" }}
            />
          </button>

          <FileText size={14} style={{ color: "var(--nb-page-icon)", flexShrink: 0 }} />

          {editingId === node.id ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => finishRename(node.id)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") finishRename(node.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              style={{
                flex: 1, minWidth: 0, fontSize: 13, background: "transparent",
                border: "none", outline: "none", color: "var(--color-text)",
              }}
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); setDraft(node.title); setEditingId(node.id); }}
              style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {node.title || "Untitled"}
            </span>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onAdd(node.id); if (isCollapsed) toggleCollapse(node.id); }}
            tabIndex={-1}
            title="Add sub-page"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ display: "flex", alignItems: "center", padding: 2, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", flexShrink: 0 }}
          >
            <Plus size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            tabIndex={-1}
            title="Delete page"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ display: "flex", alignItems: "center", padding: 2, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", flexShrink: 0 }}
          >
            <Trash2 size={12} />
          </button>
        </div>

        {hasChildren && !isCollapsed && (
          <div>{node.children!.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  }

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: 256,
        flexShrink: 0,
        background: "var(--nb-sidebar-bg)",
        backdropFilter: "var(--glass-blur)",
        borderRight: "1px solid var(--glass-border)",
      }}
      aria-label="Notebook pages"
    >
      <div className="flex items-center gap-2 px-3" style={{ height: 44, borderBottom: "1px solid var(--glass-border)" }}>
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide truncate" style={{ color: "var(--color-text-muted)" }}>
<<<<<<< HEAD
          {title ?? "Pages"}
        </span>
        <button
          onClick={() => onAdd(null)}
          title="New page"
          style={{ display: "flex", alignItems: "center", padding: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", borderRadius: 6 }}
        >
          <Plus size={15} />
        </button>
=======
          {showBacklinks ? "Backlinks" : (title ?? "Pages")}
        </span>
        {!showBacklinks && (
          <>
            <button
              onClick={() => onAdd(null)}
              title="New page"
              style={{ display: "flex", alignItems: "center", padding: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", borderRadius: 6 }}
            >
              <Plus size={15} />
            </button>
            {(backlinks?.length ?? 0) > 0 && (
              <button
                onClick={() => setShowBacklinks(true)}
                title="Show backlinks"
                style={{ display: "flex", alignItems: "center", padding: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-primary)", borderRadius: 6 }}
              >
                <Link2 size={15} />
              </button>
            )}
          </>
        )}
        {showBacklinks && (
          <button
            onClick={() => setShowBacklinks(false)}
            title="Back to pages"
            style={{ display: "flex", alignItems: "center", padding: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", borderRadius: 6 }}
          >
            <ChevronRight size={15} />
          </button>
        )}
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
        <button
          onClick={onCollapseSidebar}
          title="Hide sidebar"
          style={{ display: "flex", alignItems: "center", padding: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", borderRadius: 6 }}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

<<<<<<< HEAD
      <div
        role="tree"
        aria-label="Page tree"
        className="flex-1 overflow-y-auto p-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          // Drop into empty tree area → move to root end.
          if (dragId.current) onMove(dragId.current, null, tabs.length);
          dragId.current = null;
        }}
      >
        {tabs.map((node) => renderNode(node, 0))}
      </div>
=======
      {!showBacklinks ? (
        <div
          role="tree"
          aria-label="Page tree"
          className="flex-1 overflow-y-auto p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            // Drop into empty tree area → move to root end.
            if (dragId.current) onMove(dragId.current, null, tabs.length);
            dragId.current = null;
          }}
        >
          {tabs.map((node) => renderNode(node, 0))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          {(backlinks?.length ?? 0) === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", padding: 8 }}>No backlinks yet</p>
          ) : (
            backlinks?.map((backlink, idx) => (
              <div
                key={idx}
                onClick={() => handleBacklinkClick(backlink)}
                style={{
                  padding: "8px 12px",
                  marginBottom: 4,
                  borderRadius: 6,
                  background: "var(--nb-row-hover)",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--color-text)",
                  userSelect: "none",
                  transition: "background 150ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-primary-alpha, rgba(13,148,136,0.2))"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--nb-row-hover)"; }}
              >
                <div style={{ fontWeight: 500, marginBottom: 2 }}>
                  {backlink.sourceCardTitle ?? "Notebook"} › {backlink.sourceTabTitle}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  @ {backlink.mentionLabel}
                </div>
              </div>
            ))
          )}
        </div>
      )}
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
    </aside>
  );
}
