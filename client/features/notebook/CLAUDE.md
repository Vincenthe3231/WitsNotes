# CLAUDE.md — client/features/notebook/

Notebook feature: multi-tab rich-text editor per card, with optional AES-GCM encryption.

## Files

| File | Purpose |
|------|---------|
| `NotebookEditor.tsx` | BlockNote editor wrapper with error boundary, slash/@ menus |
| `NotebookEditorDynamic.tsx` | `dynamic(() => import('./NotebookEditor'), { ssr: false })` — prevents SSR crash |
| `NotebookSidebar.tsx` | Page/tab tree sidebar with drag-to-reorder |
| `nestingEnter.ts` | BlockNote extension: Enter in nested list item → dedent |

Page lives at: `client/app/(canvas)/board/[id]/notebook/[cardId]/page.tsx`  
Save hook: `client/hooks/useNotebookSave.ts`

## Save Flow

```
User types
  → NotebookEditorInner.handleChange()
  → onChange(blocks) prop
  → page.tsx: handleTabChange() → updateTabs()
  → useNotebookSave.save(tabs)   ← 800 ms debounce
  → doSave() → useUpdateCard().mutate(vars)
  → If online:  HTTP PATCH /api/proxy/cards/{id}  → saved
  → If offline: mutation paused → idbPersister writes to IDB within 300 ms
```

**Topbar status indicators:**
- `"saving"` — debounce pending, online
- `"queued"` — debounce pending or mutation paused, offline (shows WifiOff icon)
- `"saved"` — mutation settled successfully
- `"error"` — mutation failed

## Flush Behaviour

`flush()` forces the debounce immediately (calls `doSave` synchronously):
- SPA unmount: `useEffect(() => () => flush(), [flush])` in page.tsx
- Hard reload / tab close: `beforeunload` event listener in page.tsx

Both are required — React cleanup does NOT run on browser refresh.

## Encryption (Optional)

Cards can be encrypted with AES-GCM (libsodium). When `card.style.encrypted === true`:
- `content` stores `{ ciphertext: string }` (base64), not `{ tabs }`.
- Decryption key derived from user password + stored salt (`card.style.vault_salt`).
- Session key cached in memory via `cacheKey(cardId, key)` (`lib/crypto/notebook.ts`).
- `useNotebookSave.doSave` encrypts before calling `mutate` when `decryptKey` is set.
- Clearing cache on unmount (`clearCachedKey(cardId)`) means reopening always prompts for password.

**Never log or persist the raw encryption key.**

## Tab Tree

Tabs form a tree (nested pages). Utilities in `lib/notebook/tree.ts`:
- `findNode`, `firstLeaf`, `updateNode`, `insertChild`, `removeNode`, `moveNode`
- `findBacklinks` — finds cards that `@mention` this card
- `generateAnchorId` — stable heading anchor IDs for in-page links

`parseTabs` in page.tsx handles legacy cards: if `content.blocks` exists (old format), it lifts the blocks into a single tab automatically.

## BlockNote Notes

- Schema extended with `alert` block type (`features/editor/AlertBlock.tsx`) and `notebookMention` inline content.
- `initialContent` must be sanitized via `sanitizeBlocks()` (`lib/notebook/sanitizeBlocks.ts`) before passing to `useCreateBlockNote` to strip invalid block types.
- Editor is wrapped in `EditorBoundary` (React error boundary) — if `initialContent` crashes BlockNote, it retries with empty doc. onChange does NOT fire on empty-doc mount, so it won't overwrite DB content.
- `key={tab.id}` on `NotebookEditor` forces full remount when switching tabs.
