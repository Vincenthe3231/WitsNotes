# CLAUDE.md — client/

Next.js 15 (App Router), React 19, TypeScript, Tailwind v4.  
Package manager: **pnpm** (never npm/yarn in this directory).

## Commands

```bash
pnpm dev                   # dev server — localhost:3000
pnpm build && pnpm start   # production build + server (required for SW / offline testing)
pnpm lint                  # ESLint — run after every edit. NEVER use tsc --noEmit.
pnpm add <pkg>             # add dependency
pnpm add -D <pkg>          # add devDependency
```

## Directory Map

```
app/                   Next.js App Router pages + route handlers
  (canvas)/            Board canvas + notebook routes (grouped, no URL prefix)
  api/proxy/[...path]/ Proxy route — forwards requests to Laravel with Bearer token
  ~offline/            Static offline fallback page (served by SW when offline)
  layout.tsx           Root layout — fonts, Providers, Topbar
  providers.tsx        QueryClient + PersistQueryClientProvider + onlineManager
  sw.ts                Serwist service worker (precache + offline fallback)

components/
  layout/              Topbar, shell layout
  ui/                  Shared UI: SyncStatus, InstallPrompt, CommandPalette, modals

features/
  boards/              Board list / create
  canvas/              Drag-and-drop canvas (CanvasLayer, card drag/resize, zustand store)
  cards/               Card type components (BookmarkCard, TodoCard, ImageCard, AudioCard, FileCard, GifCard…)
  editor/              AlertBlock, NotebookMention inline content
  notebook/            NotebookEditor (BlockNote), NotebookSidebar, tree utils

hooks/                 Custom hooks (useNotebookSave, useHydrated, useThemeMode, useAuthGuard…)
lib/
  api/                 API client, query hooks, mutation defaults, persister — see lib/api/CLAUDE.md
  crypto/              Notebook encryption (AES-GCM via libsodium)
  notebook/            Tab tree utilities (tree.ts, sanitizeBlocks.ts)
stores/                Zustand stores (canvasStore, authStore, commandStore)
public/
  icons/               PWA icons (icon-192.png, icon-512.png, icon.svg)
  manifest.json        Web app manifest
```

## Patterns

### Auth
- Auth state in `useAuthStore` (zustand). `useAuthGuard` hook verifies session on mount.
- API calls go through `apiClient` (axios, `lib/api/client.ts`) → Next proxy → Laravel.
- Never call Laravel directly from client JS — always via `/api/proxy/[...path]`.

### Data fetching
- All server state via TanStack Query (`useBoard`, `useBoards`, etc. in `lib/api/hooks.ts`).
- Mutations use `mutationKey` + `registerMutationDefaults` for offline rehydration.
- Query cache persisted to IndexedDB (`idbPersister`). `gcTime: 7 days`.

### Offline / PWA
- SW only active in production build — test with `pnpm build && pnpm start`.
- `onlineManager` uses DOM `online`/`offline` events only — no `setInterval`.
- Paused mutations resume via `resumePausedMutations()` in `providers.tsx` `onSuccess`.
- Notebook saves debounce 800 ms then enqueue as paused mutation when offline.
- `idbPersister` throttles writes to 300 ms. Debug logs prefixed `[idb]` at `console.debug`.

### Styling
- Tailwind v4 utility classes + CSS custom properties (design tokens in `app/globals.css`).
- Glass/neumorphic surface vars: `--glass-bg-light`, `--glass-border`, `--glass-blur`.
- Color vars: `--color-primary`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`.

### Component rules
- All interactive components: `"use client"` directive.
- SSR-safe browser checks: use `useHydrated()` hook, not bare `typeof window !== "undefined"` in render.
- No `pages/` directory — App Router only.

### Media cards & file upload
- Card types `image`, `gif`, `audio`, `file` created via `CardPalette` file picker or canvas drop import.
- Upload flow: `CardPalette.handleFileChosen` → `createCardAsync` (optimistic card) → `uploadCardAttachment` (XHR + progress) → `updateCard` (attach attachment_id).
- Progress state persisted in card's `content: { status: "uploading" | "ready" | "error", progress: 0–100 }`.
- Failure → retry button overlay in CardShell; click to retry upload (new file picker or same file).
- See `lib/api/CLAUDE.md` for upload pipeline detail.

### Toast notifications
- `useToastStore` (zustand, `stores/toastStore.ts`) — `push(level, message, ttl)` queues a toast; auto-expire per level (error 6s, warning 5s, info/success 3s).
- `Toaster` component (glass surface, per-level icons, max 5 visible, oldest dismissed first) mounted in `providers.tsx`.
- axios response interceptor routes errors: 422→no toast (inline errors), 401→redirect+session toast, others→error toast, 409→no toast (SyncStatus handles).
- Outside React, call `useToastStore.getState().push()` directly.

### Confirmation dialogs
- `useConfirmStore` (promise-based, `stores/confirmStore.ts`) — `await confirm({title, message, danger})` returns boolean.
- `ConfirmDialog` component (glass modal, focus-trap, Esc-cancel, Cancel autofocused) mounted in `providers.tsx`.
- Delete paths (`CardShell` trash, `GroupToolbar`, `useCanvasKeyboard` Delete/Backspace) gate deletion via `await confirm()`.

### Canvas read / edit mode
- `canvasStore.mode` ('read' | 'edit'); toggle via `CardPalette` mode segment (Hand/MousePointer2 pill) or H/V hotkeys.
- **Read mode** (gesture only): `useMarqueeSelect` blocks marquee, `useCanvasPointer` only pans/zooms; `CardShell` hides selection click/drag/resize/delete/title-edit (double-click notebook open OK); `useCanvasKeyboard` blocks Delete/Backspace/Cmd+A/Cmd+D; `useCanvasDropImport`/`useCanvasPaste` no-op; `GroupToolbar` returns null.
- **Edit mode** (full interaction): all gestures enabled, palette content visible.
- `CardPalette` collapses content/media buttons in read mode via CSS `maxWidth` + `opacity` transition (200ms, respects `prefers-reduced-motion`).

### Paste-from-clipboard import
- `useCanvasPaste` (wired in `InfiniteCanvas`) detects clipboard type: image blob→image card, URL text→bookmark card, plain text→memo (note) card.
- Pasted cards spawn at `canvasCenter(viewport)`, not cursor-follow.
- Gated by edit mode + input-focus check.
- Toast feedback (1 line, 2s): "Pasted image", "Pasted link", "Pasted text".
