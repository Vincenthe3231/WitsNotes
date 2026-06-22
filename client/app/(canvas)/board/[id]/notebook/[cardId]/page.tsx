"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, Lock, Unlock, PanelLeft } from "lucide-react";
import { useBoard, useUpdateCard } from "@/lib/api/hooks";
import { NotebookTab } from "@/lib/api/schemas";
import { NotebookSidebar } from "@/features/notebook/NotebookSidebar";
<<<<<<< HEAD
import { findNode, firstLeaf, updateNode, insertChild, removeNode, moveNode } from "@/lib/notebook/tree";
=======
import { findNode, firstLeaf, updateNode, insertChild, removeNode, moveNode, findBacklinks, type Backlink } from "@/lib/notebook/tree";
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
import { NotebookEditor } from "@/features/notebook/NotebookEditorDynamic";
import { Block } from "@blocknote/core";
import { useNotebookSave } from "@/hooks/useNotebookSave";
import { PasswordModal } from "@/components/ui/PasswordModal";
import { SetPasswordModal } from "@/components/ui/SetPasswordModal";
import {
  deriveKey, generateSalt, makeVerifier, checkVerifier,
  encryptContent, decryptContent, cacheKey, getCachedKey, clearCachedKey,
} from "@/lib/crypto/notebook";

function makeid() {
  return Math.random().toString(36).slice(2, 10);
}

function parseTabs(content: Record<string, unknown> | null): NotebookTab[] {
  const tabs = (content as { tabs?: NotebookTab[] } | null)?.tabs;
  if (tabs?.length) return tabs;
  // Legacy note cards stored blocks directly in content.blocks — lift into a single tab.
  const legacyBlocks = (content as { blocks?: unknown[] } | null)?.blocks;
  return [{ id: makeid(), title: "Untitled", blocks: legacyBlocks ?? [] }];
}

export default function NotebookPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const { id: boardId, cardId } = use(params);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") ?? undefined;
  const router = useRouter();
  const { data, isLoading, isError } = useBoard(boardId);
  const { save, flush, status } = useNotebookSave(cardId, boardId);
  const { mutate: updateCard } = useUpdateCard(boardId);

  const card = data?.cards.find((c) => c.id === cardId);
  const isEncrypted = !!(card?.style as { encrypted?: boolean } | null)?.encrypted;

  const [tabs, setTabs] = useState<NotebookTab[]>([]);
  const [activeId, setActiveId] = useState<string>(tabParam ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(true);
<<<<<<< HEAD
=======
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad

  // Sync activeId when ?tab= URL param changes without page remount (same-card mention nav)
  useEffect(() => {
    if (tabParam) setTimeout(() => setActiveId(tabParam), 0);
  }, [tabParam]);
  const [unlocked, setUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [decryptKey, setDecryptKey] = useState<Uint8Array | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // Flush pending autosave on unmount (covers SPA navigation away from the page)
  useEffect(() => {
    return () => flush();
  }, [flush]);

  // Clear session key on unmount so reopening always prompts for password
  useEffect(() => {
    return () => clearCachedKey(cardId);
  }, [cardId]);

  // Init tabs once card loads
  useEffect(() => {
    if (!card) return;
    const encrypted = (card.style as { encrypted?: boolean } | null)?.encrypted;
    if (!encrypted) {
      const tabs = parseTabs(card.content);
      setTimeout(() => {
        setTabs(tabs);
        setActiveId((id) => id || (tabs[0]?.id ?? ""));
        setUnlocked(true);
<<<<<<< HEAD
=======
        // Find backlinks to this card
        if (data?.cards) {
          const backlinksFound = findBacklinks(data.cards, cardId, undefined);
          setBacklinks(backlinksFound);
        }
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
      }, 0);
    } else {
      const cached = getCachedKey(cardId);
      if (cached) {
        const ciphertext = (card.content as { ciphertext?: string } | null)?.ciphertext;
        if (ciphertext) {
          decryptContent(cached, ciphertext).then((plain) => {
            const t = parseTabs(plain as Record<string, unknown>);
            setTimeout(() => {
              setDecryptKey(cached);
              setUnlocked(true);
              setTabs(t);
              setActiveId(t[0]?.id ?? "");
<<<<<<< HEAD
=======
              // Find backlinks to this card
              if (data?.cards) {
                const backlinksFound = findBacklinks(data.cards, cardId, undefined);
                setBacklinks(backlinksFound);
              }
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
            }, 0);
          });
        } else {
          setTimeout(() => { setDecryptKey(cached); setUnlocked(true); }, 0);
        }
      } else {
        setTimeout(() => setShowPasswordModal(true), 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
<<<<<<< HEAD
  }, [card?.id, isEncrypted]);
=======
  }, [card?.id, isEncrypted, data?.cards]);
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad

  async function handlePasswordSubmit(password: string): Promise<boolean> {
    const salt = (card?.style as { vault_salt?: string } | null)?.vault_salt ?? "";
    const verifier = (card?.style as { vault_verifier?: string } | null)?.vault_verifier ?? "";
    const key = await deriveKey(password, salt);
    const ok = await checkVerifier(key, verifier);
    if (!ok) return false;
    cacheKey(cardId, key);
    setDecryptKey(key);
    setUnlocked(true);
    setShowPasswordModal(false);
    const ciphertext = (card?.content as { ciphertext?: string } | null)?.ciphertext;
    if (ciphertext) {
      const plain = await decryptContent(key, ciphertext);
      const t = parseTabs(plain as Record<string, unknown>);
      setTabs(t);
      setActiveId(t[0]?.id ?? "");
    }
    return true;
  }

  async function handleSetPassword(password: string) {
    setShowSetPassword(false);
    const salt = await generateSalt();
    const key = await deriveKey(password, salt);
    const verifier = await makeVerifier(key);
    const ciphertext = await encryptContent(key, { tabs });
    cacheKey(cardId, key);
    setDecryptKey(key);
    save(tabs, { encrypted: true, vault_salt: salt, vault_verifier: verifier, ciphertext });
  }

  const updateTabs = useCallback(
    (next: NotebookTab[]) => {
      setTabs(next);
      if (decryptKey) {
        encryptContent(decryptKey, { tabs: next }).then((ciphertext) => {
          save(next, { encrypted: true, ciphertext });
        });
      } else {
        save(next);
      }
    },
    [save, decryptKey]
  );

  function handleTabChange(blocks: Block[]) {
    updateTabs(updateNode(tabs, activeId, { blocks }));
  }

  function addTab(parentId: string | null) {
    const newTab: NotebookTab = { id: makeid(), title: "Untitled", blocks: [] };
    updateTabs(insertChild(tabs, parentId, newTab));
    setActiveId(newTab.id);
  }

  function renameTab(id: string, title: string) {
    updateTabs(updateNode(tabs, id, { title }));
  }

  function deleteTab(id: string) {
    const next = removeNode(tabs, id);
    if (next.length === 0) return; // never delete the last remaining page
    if (activeId === id || !findNode(next, activeId)) {
      setActiveId(firstLeaf(next)?.id ?? "");
    }
    updateTabs(next);
  }

  function handleMove(fromId: string, toParentId: string | null, index: number) {
    updateTabs(moveNode(tabs, fromId, toParentId, index));
  }

  function saveCardTitle(val: string) {
    setEditingTitle(false);
    const t = val.trim();
    if (t && card && t !== (card.title ?? "")) {
      updateCard({ id: cardId, input: { title: t } });
    }
  }

  function lockSession() {
    clearCachedKey(cardId);
    setDecryptKey(null);
    setUnlocked(false);
    setShowPasswordModal(true);
  }

  function removeLock() {
    clearCachedKey(cardId);
    setDecryptKey(null);
    save(tabs, { encrypted: false, vault_salt: null, vault_verifier: null });
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen" style={{ color: "var(--color-text-muted)" }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (isError || (!isLoading && !card)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2" style={{ color: "var(--color-text-muted)" }}>
        <p>Notebook not found.</p>
        <button onClick={() => router.push(`/board/${boardId}`)} className="text-sm underline cursor-pointer" style={{ background: "none", border: "none", color: "var(--color-primary)" }}>
          Back to board
        </button>
      </div>
    );
  }

  const activeTab = findNode(tabs, activeId) ?? firstLeaf(tabs);

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--color-canvas-from)", color: "var(--color-text)" }}>
      {/* Topbar */}
      <div
        className="flex items-center gap-3 px-4"
        style={{ height: 52, borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg-light)", backdropFilter: "var(--glass-blur)", flexShrink: 0 }}
      >
        <button
          onClick={() => router.push(`/board/${boardId}`)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 13, padding: "4px 8px", borderRadius: 8 }}
        >
          <ArrowLeft size={16} />
          Board
        </button>
        {unlocked && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="Show pages"
            style={{ display: "flex", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4, borderRadius: 8 }}
          >
            <PanelLeft size={16} />
          </button>
        )}
        <span style={{ width: 1, height: 20, background: "var(--color-border)" }} />
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={(e) => saveCardTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveCardTitle(titleDraft); if (e.key === "Escape") setEditingTitle(false); }}
            className="text-sm font-semibold flex-1"
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--color-text)", padding: 0 }}
          />
        ) : (
          <span
            className="text-sm font-semibold truncate flex-1"
            style={{ color: "var(--color-text)", cursor: "text" }}
            onDoubleClick={() => { setTitleDraft(card?.title ?? "Notebook"); setEditingTitle(true); }}
            title="Double-click to rename"
          >
            {card?.title ?? "Notebook"}
          </span>
        )}

        {status === "saving" && (
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <Loader2 size={12} className="animate-spin" /> Saving…
          </span>
        )}
        {status === "saved" && (
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <CheckCircle size={12} /> Saved
          </span>
        )}
        {status === "error" && <span className="text-xs text-red-500">Save failed</span>}

        {unlocked && !isEncrypted && (
          <button
            onClick={() => setShowSetPassword(true)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 12, padding: "4px 8px", borderRadius: 8 }}
            title="Lock notebook"
          >
            <Unlock size={14} />
          </button>
        )}
        {unlocked && isEncrypted && (
          <>
            <button
              onClick={lockSession}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: 12, padding: "4px 8px", borderRadius: 8 }}
              title="Lock notebook (keep encryption)"
            >
              <Lock size={14} />
            </button>
            <button
              onClick={removeLock}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 12, padding: "4px 8px", borderRadius: 8 }}
              title="Remove encryption"
            >
              <Unlock size={14} />
            </button>
          </>
        )}
      </div>

      {/* Sidebar + editor split */}
      <div className="flex-1 flex overflow-hidden">
        {unlocked && sidebarOpen && tabs.length > 0 && (
          <NotebookSidebar
            tabs={tabs}
            activeId={activeTab?.id ?? ""}
            title={card?.title ?? "Pages"}
            onSelect={setActiveId}
            onAdd={addTab}
            onRename={renameTab}
            onDelete={deleteTab}
            onMove={handleMove}
            onCollapseSidebar={() => setSidebarOpen(false)}
<<<<<<< HEAD
=======
            backlinks={backlinks}
            currentCardId={cardId}
            currentTabId={activeId}
            boardId={boardId}
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
          />
        )}

        <div className="flex-1 overflow-auto">
          {unlocked && activeTab && (
            <NotebookEditor key={activeTab.id} tab={activeTab} boardId={boardId} onChange={handleTabChange} />
          )}
          {!unlocked && !showPasswordModal && (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)" }}>
              <Lock size={32} style={{ opacity: 0.3 }} />
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <PasswordModal
          onSubmit={handlePasswordSubmit}
          onCancel={() => { setShowPasswordModal(false); router.push(`/board/${boardId}`); }}
        />
      )}
      {showSetPassword && (
        <SetPasswordModal onSubmit={handleSetPassword} onCancel={() => setShowSetPassword(false)} />
      )}
    </div>
  );
}
