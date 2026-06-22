# Phase 2 — Offline-first PWA (detailed plan)

## Context

`PLAN.md` Phase 2 ("Offline-first PWA") is currently a vague bullet list. Only the
Serwist asset cache is done; reads/writes do **not** survive offline, the PWA is
**not installable** (manifest references missing icons), and there is no sync feedback.
This plan turns Phase 2 into an executable spec on the existing `feat/offline-PWA` branch.

**Codegraph findings that shape the design:**
- **Proxy auth is the offline pivot.** `apiClient` (axios, `client/lib/api/client.ts`)
  calls `/api/proxy/[...path]` — a Next **server** route handler
  (`client/app/api/proxy/[...path]/route.ts`) that reads the httpOnly `wn_sid` cookie
  and forwards a Bearer token to Laravel. JS never sees the token; the browser
  auto-attaches the cookie on replay. ⇒ Offline **reads must come from client-side
  IndexedDB (react-query persistence)**, not the route handler (which is unreachable offline).
- `client/app/providers.tsx` uses a plain `QueryClientProvider` — no persistence
  (`gcTime` default 5 min ⇒ cache is GC'd, nothing survives reload).
- `client/lib/api/hooks.ts`: create-board/create-card have optimistic `onMutate`
  (snapshot + rollback). **`useUpdateCard` / `useDeleteCard` are invalidate-only** — no
  optimistic cache write, so a persisted cache would not reflect offline moves/deletes.
- Canvas renders server cards (react-query) **merged** with `localCards` (zustand `Map`,
  in-memory only) in `client/features/canvas/CanvasLayer.tsx:21`. `localCards` is lost on
  reload — the persisted **query cache** must be the durable source after reload.
- `client/public/manifest.json` exists and is wired (`layout.tsx` metadata) but
  `public/icons/icon-192.png` / `icon-512.png` **do not exist** ⇒ install fails.
- `client/app/sw.ts` is minimal Serwist (precache + `defaultCache`),
  `disable: NODE_ENV !== "production"` ⇒ SW only runs in a production build. No offline
  fallback page, no install prompt, no sync-status UI.
- Not installed: `@tanstack/react-query-persist-client`, persister, `idb-keyval`, `yjs`.

**Decisions (confirmed with user):**
1. **Sync engine = TanStack persist + paused-mutation replay.** Reuse existing optimistic
   hooks; no CRDT. **Yjs is deferred to Phase 3 (collab)** — single-user offline does not
   need it.
2. **Conflict policy = `updated_at` guard.** Client sends the base `updated_at`; server
   returns `409` on stale; client refetches + surfaces a conflict toast. (Only server change.)
3. **Full PWA polish** — generate icons, install prompt, offline fallback page,
   sync-status `aria-live` indicator, Lighthouse PWA pass.

Outcome: open a board online, go offline, drag/edit/create/delete cards, **reload while
offline** (data + edits intact), reconnect → queued edits replay with conflict-safe
`updated_at` guard; app is installable and passes Lighthouse PWA.

---

## Workstream 1 — Offline reads (query persistence)

**Dependency choice (revised — avoid the questioned `*-storage-persister` packages).**
`@tanstack/query-async-storage-persister` is not formally deprecated, but the maintained
modern path is per-query `experimental_createPersister`. However, `experimental_createPersister`
persists **queries only — not paused mutations**, and WS2 (offline write replay across
reload) needs mutation persistence. So use the whole-client
**`@tanstack/react-query-persist-client`** (`PersistQueryClientProvider`, persists queries +
mutations) with a **hand-rolled `Persister`** over `idb-keyval` — dropping
`@tanstack/query-async-storage-persister` entirely.

New deps (in `client/`): `@tanstack/react-query-persist-client`, `idb-keyval`
(or raw `idb` if avoiding idb-keyval; no `*-storage-persister` package).

- **`client/lib/api/persister.ts`** (new) — implement the `Persister` interface directly
  (the documented custom-persister escape hatch):
  ```ts
  import { get, set, del } from "idb-keyval";
  import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";
  const KEY = "witsnote-rq";
  export const idbPersister: Persister = {
    persistClient: (c: PersistedClient) => set(KEY, c),   // structured-clone, no JSON
    restoreClient: () => get<PersistedClient>(KEY),
    removeClient: () => del(KEY),
  };
  ```
  (IndexedDB, not localStorage — board/card payloads exceed the ~5 MB localStorage cap.)
  Optional throttle on `persistClient` (~1 s) to avoid thrashing during drag bursts.
- **`client/app/providers.tsx`** — edit:
  - QueryClient defaults: add `gcTime: 1000 * 60 * 60 * 24 * 7` (7 d) so cached
    boards/cards survive past `staleTime`; keep `staleTime: 60_000`, `retry: 1`.
  - Replace `QueryClientProvider` with **`PersistQueryClientProvider`**, passing
    `persistOptions={{ persister: idbPersister, maxAge: 7d, buster: <pkg version>,
    dehydrateOptions: { shouldDehydrateMutation: () => true } }}` and
    `onSuccess={() => queryClient.resumePausedMutations()}`.
  - Keep `CommandPalette` + `ReactQueryDevtools` children.

Result: `useBoards` / `useBoard` (`hooks.ts`) restore from IndexedDB on cold load — no
network needed. The proxy route handler is bypassed for offline reads. SW does **not** need
to cache `/api/proxy` GETs (persistence covers data); SW only handles the app shell.

## Workstream 2 — Offline writes (rehydratable optimistic mutations + replay)

react-query pauses mutations while offline; to resume them **after a reload**, the
mutation fns must be rehydratable via `setMutationDefaults` (a closure cannot be persisted).

- **`client/lib/api/hooks.ts`** — refactor card mutations:
  - Add a `registerMutationDefaults(qc)` that calls `qc.setMutationDefaults` for stable
    keys: `["cards","create"]`, `["cards","update"]`, `["cards","delete"]` (and board
    equivalents). Move `mutationFn` + `onMutate`/`onError`/`onSettled` into the defaults.
  - **Carry `boardId` in mutation *variables*, not the key**, so one default serves every
    board and survives reload: e.g. update variables become `{ boardId, id, input }`;
    default `onSettled` invalidates `boardKeys.detail(variables.boardId)`.
  - `useUpdateCard` / `useDeleteCard` / `useCreateCard` reduce to
    `useMutation({ mutationKey })` (config lives in defaults).
  - Call `registerMutationDefaults(queryClient)` once in `providers.tsx` (before persist
    restore).
- **Add optimistic cache writes to update + delete** (today they only invalidate):
  mirror `useCreateCard`'s pattern — `onMutate` snapshots `boardKeys.detail(boardId)`,
  patches the `cards` array (move/resize/title fields, or removes the card), `onError`
  rolls back. This is what makes offline moves/deletes **persist across reload** (the
  patched cache is dehydrated to IndexedDB). zustand `localCards`
  (`CardShell.tsx` handlers) stays for in-drag smoothness only.
- Keep `networkMode: "online"` (default) so offline mutations pause. react-query
  auto-resumes paused mutations when `onlineManager` flips online mid-session;
  `resumePausedMutations()` (WS1 `onSuccess`) covers the post-reload case.

## Workstream 3 — `updated_at` conflict guard (only server change)

- **Client** — `client/lib/api/boards.ts` `updateCard()`: include
  `base_updated_at` (the cached card's `updated_at`) in the PATCH body. On `409`,
  the mutation `onError` refetches `boardKeys.detail(boardId)`, clears the stale zustand
  `localCards` entry, and pushes a conflict toast (WS4 sync-status, `aria-live`).
- **Server** — `server/app/Http/Controllers/CardController.php` `update()`: if
  `base_updated_at` present and `!= $card->updated_at`, return
  `response()->json($freshCard, 409)`; otherwise apply. Last-write-wins fallback when the
  field is absent. (No migration — `updated_at` already exists.)
- **Test** — `server/tests/Feature/CardConflictTest.php` (Pest): stale `base_updated_at`
  ⇒ 409 + fresh card; matching ⇒ 200 + applied.

## Workstream 4 — PWA install / offline polish

- **Icons** — add `client/public/icons/icon.svg` (teal `#0D9488` "W" glyph on
  `#0B1220`) + generate maskable `icon-192.png` / `icon-512.png` via a one-off
  `client/scripts/gen-icons.mjs` (`sharp`, devDep) rasterizing the SVG at 192/512 with
  safe-zone padding. Closes the manifest gap.
- **Offline fallback** — `client/app/~offline/page.tsx` (static "You're offline" shell);
  in `client/app/sw.ts` add Serwist `fallbacks: { entries: [{ url: "/~offline",
  matcher: ({ request }) => request.destination === "document" }] }` and ensure `/~offline`
  is precached.
- **Install prompt** — `client/components/ui/InstallPrompt.tsx`: capture
  `beforeinstallprompt`, stash the deferred event, render a neumorphic "Install" button in
  `Topbar`; hide once `appinstalled` / `display-mode: standalone`.
- **Sync-status indicator** — `client/components/ui/SyncStatus.tsx`: subscribe to
  `onlineManager` + count paused/pending mutations (`useMutationState` /
  `useIsMutating`), render "Offline · N pending" / "Syncing…" / "Synced" with
  `aria-live="polite"`. Mount in `Topbar`. Doubles as the WS3 conflict-toast host.
- **manifest/layout** — already correct; verify `icons` paths resolve after generation.

## Workstream 5 — Tests (offline logic only; full backfill stays cross-cutting)

- Add Vitest + RTL config to `client/` (none today): `vitest.config.ts`, `jsdom` env.
- Unit: persister round-trip (`persister.ts`); update/delete `onMutate` optimistic patch +
  rollback; 409 conflict `onError` reducer.
- Pest: `CardConflictTest` (WS3).

---

## Critical files

| File | Change |
|------|--------|
| `client/app/providers.tsx` | PersistQueryClientProvider + gcTime + register defaults |
| `client/lib/api/persister.ts` | **new** custom `Persister` over idb-keyval (no `*-storage-persister` pkg) |
| `client/lib/api/hooks.ts` | setMutationDefaults, optimistic update/delete, boardId-in-vars |
| `client/lib/api/boards.ts` | `updateCard` sends `base_updated_at` |
| `server/app/Http/Controllers/CardController.php` | `update()` 409 on stale `updated_at` |
| `client/app/sw.ts` | offline `fallbacks` |
| `client/app/~offline/page.tsx` | **new** offline shell |
| `client/public/icons/*` + `client/scripts/gen-icons.mjs` | **new** maskable icons |
| `client/components/ui/{InstallPrompt,SyncStatus}.tsx` | **new** install + sync UI |

## Reuse (don't reinvent)
- Optimistic pattern: copy `useCreateCard` `onMutate`/`onError`/`onSettled`
  (`hooks.ts:79`) for update/delete.
- Merge/cull already handle extra/optimistic cards (`CanvasLayer.tsx:21`) — no canvas
  render change needed.
- `useHydrated` (`client/hooks/useHydrated.ts`) for SSR-safe online/standalone checks.
- Topbar already exists — mount Install + SyncStatus there.

## Verification (SW only runs in a production build — `disable: NODE_ENV !== "production"`)
1. `cd client && pnpm build && pnpm start` (server: `docker compose up -d postgres redis`,
   `php artisan serve`).
2. Online: open a board, add/move/edit/delete cards.
3. DevTools → Network **Offline**: drag/edit/create/delete → UI updates; **reload** → data
   + edits intact (from IndexedDB); navigate to a new route → `/~offline` fallback.
4. Back **Online**: paused mutations replay; SyncStatus → "Synced"; confirm server state via
   `GET /api/boards/{id}`.
5. Conflict: edit same card on a 2nd device, then replay a stale edit → 409 → conflict
   toast + refetch.
6. `pnpm test` (Vitest) + `php artisan test --filter=CardConflict`.
7. Lighthouse → PWA: **installable** + **offline-capable**; verify install prompt and
   maskable icons.

## Risks / notes
- **php-pro surface is tiny** — Phase 2 is ~95% frontend; the only server change is the
  `CardController::update` 409 guard.
- **Move-mutation volume**: each drag-end queues one `update`; offline bursts replay in
  order (last-write-wins server-side ⇒ final state correct). Acceptable for single-user;
  Yjs in P3 collapses this to final state.
- **Mutation rehydration**: paused mutations only resume post-reload if registered via
  `setMutationDefaults` with serializable variables — keep `content`/`style` JSON-safe.
- **`buster`**: bump on cache-shape changes to discard stale persisted caches.
- Still zero pre-existing tests (`PLAN.md` cross-cutting debt) — scope here to offline
  logic; broader backfill continues per phase.
- **Persister dep**: do **not** add `@tanstack/query-async-storage-persister` /
  `createAsyncStoragePersister` — use the hand-rolled `idbPersister` (WS1).
  `experimental_createPersister` is queries-only and cannot carry paused-mutation replay.
- **Yjs (P3, not this phase) — singleton pattern.** When Yjs lands in Phase 3, enforce a
  single `Y.Doc` per board via a module-level registry (e.g.
  `const docs = new Map<boardId, Y.Doc>()`), and a single `y-indexeddb`/provider instance
  per doc. Never construct `Y.Doc`/providers inside React render — create lazily in the
  registry and reuse across re-renders + HMR to avoid duplicate docs and double-applied
  updates. Tear down the provider on board unmount.