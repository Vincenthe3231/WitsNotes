# WitsNote — Milanote-like Note-taking PWA: Architecture & Phased Task Plan

## Context

Building **WitsNote**, an offline-capable PWA for visual note-taking on an infinite canvas (Milanote-like) with power features: rich-text memos (Notion-like), freehand sketching, mind-maps, task scheduling, templates, real-time collaboration, fuzzy + handwritten search, and password-locked notebooks.

This plan was first drafted against an empty scaffold. A **codegraph audit (101 files / 775 nodes indexed) shows substantial work already shipped** — Phase 0 and most of Phase 1 are done, vault crypto is done early. This revision records the **actual on-disk state** and expands every phase into a **detailed, status-tagged task list** so remaining work is executable.

**Locked decisions:** Laravel 13 + PostgreSQL backend (Eloquent, no Prisma) · Next.js frontend · Yjs CRDT for offline+collab · per-notebook password lock · phased MVP-first · no heavy patterns (no CQRS) · glassmorphism+neumorphism hybrid · performance-first infinite canvas, WebGPU only where it earns it.

Status legend: ✅ done · 🟡 partial · ⬜ not started.

---

## Current Progress Snapshot (from codegraph)

**Backend (Laravel, `server/`)** — ✅ working REST API on Postgres:
- Auth: `AuthController` (register/login/logout/me) via Sanctum personal-access-tokens; `BoardPolicy` (owner-only view/update/delete).
- Boards: `BoardController` CRUD; `Board` model `HasUuids + SoftDeletes`, vault columns (`is_vault`, `vault_salt`, `vault_verifier`).
- Cards: `CardController` CRUD + `search`; `Card` model; polymorphic `type` enum, `x/y/w/h/z/rotation`, `content` jsonb, `content_text`, `due_at`/`remind_at`.
- Unfurl: `UnfurlController` scrapes OG tags for bookmarks.
- Migrations incl. `enable_pg_trgm_extension`; routes in `server/routes/api.php` (`apiResource` boards + shallow cards, `/cards/search`, `/unfurl`).
- Offline conflict guard: `CardController::update` returns **409 + fresh card** when client `base_updated_at` is stale; last-write-wins when absent. Covered by Pest `CardConflictTest` (3 cases) + `Board`/`Card` factories.

**Frontend (Next.js, `client/`)** — ✅ canvas + notes MVP:
- Canvas: `InfiniteCanvas` + `CanvasLayer` (viewport culling, single GPU transform wrapper), `useCanvasPointer` (rAF-throttled pan + wheel zoom, scale clamp 0.1–4), `useCardDrag` (8px snap), `useCardResize`; `canvasStore` (zustand: viewport/selection/dragging/localCards).
- Cards: `CardShell`, `CardPalette`, `MemoCard`, `TodoCard` (todo+task), `BookmarkCard` (live unfurl), `NotebookCard` (wiki preview / locked state).
- Editor: **BlockNote** (`@blocknote/mantine`, Tiptap/ProseMirror-based) — `NotionEditor` + `NotionEditorDynamic` (ssr:false), custom `AlertBlock` callout, slash menu, formatting toolbar.
- Notebook: **wiki-style nested pages** — `NotebookSidebar` (tree, drag-drop reparent, rename, add/delete, collapse, a11y `role=tree`), `NotebookEditor`, `useNotebookSave` (2s debounced autosave), `lib/notebook/tree.ts`; full-page route `app/(canvas)/board/[id]/notebook/[cardId]`.
- Data: `lib/api/{client(axios),boards,hooks,schemas(zod),auth}.ts` — tanstack-query with optimistic create for boards/cards; `react-query-devtools` wired.
- Search: `CommandPalette` (cmdk) Commands + Search tabs; `commandStore` registry; `useSearchCards`.
- Crypto (vault): `lib/crypto/notebook.ts` — Argon2id (`crypto_pwhash`) KDF, `crypto_secretbox` encrypt/decrypt, salt + verifier, session-cached key; `PasswordModal` + `SetPasswordModal`; `useNotebookSave` blanks `content_text` when encrypted (keeps vault out of search index).
- PWA / offline (`feat/offline-PWA`): **query persistence** via `lib/api/persister.ts` (`idbPersister`, idb-keyval, key `witsnote-rq`, 300ms throttle) + `PersistQueryClientProvider` in `providers.tsx` (`maxAge` 7d, `buster v1`, `resumePausedMutations()` on restore); **offline mutation queue** via `registerMutationDefaults` (cards create/update/delete) + `shouldDehydrateMutation: () => true` so paused mutations survive reload; `onlineManager` driven by DOM `online`/`offline` events only; **`SyncStatus`** (aria-live: offline / `N pending` / syncing / synced / conflict) + **`InstallPrompt`** (`beforeinstallprompt`); **manifest** `public/manifest.json` + maskable icons (192/512, `scripts/gen-icons.mjs`); **SW** `app/sw.ts` (Serwist precache + `defaultCache` runtime caching, skipWaiting, navigationPreload, `~offline` document fallback).
- Auth/shell: `proxy.ts` (cookie `wn_sid` route guard), `authStore`, `useAuthGuard`, login/register pages, `Sidebar`, `Topbar`, theme tokens, `useThemeMode`, `useHydrated`.

**Cross-cutting gap:** 🟡 **tests bootstrapped, coverage thin** — first automated tests landed: Pest `CardConflictTest` (3 cases) + `Board`/`Card` factories (phpunit on SQLite). Still **no frontend tests** (Vitest/RTL) and **no Board/Card/Auth CRUD coverage** — codegraph reports "no covering tests" across all canvas/editor/crypto symbols.

---

## Architecture (target — corrected to reality)

```
Browser PWA (Next.js 16, React 19) ── REST/JSON (axios + Sanctum token) ──▶ Laravel 13 API ──▶ PostgreSQL (pg_trgm)
   ├─ tanstack-query (server cache, + persist → IndexedDB)                       │              ├─ Redis (queue/cache/presence)
   ├─ zustand (canvas/UI), zod (schemas)                                         ├─ queues OCR/export/reminders
   ├─ BlockNote (Tiptap-based rich text)                                         └─ object store (S3/MinIO: media, exports)
   ├─ Yjs + y-indexeddb (offline doc) ── WebSocket ──▶ Collab sidecar (Node Hocuspocus) ──▶ persists Yjs → Postgres + Redis
   ├─ PixiJS v8 sketch/connection layer (WebGPU→WebGL)        ▲ auth via Sanctum token validated against Laravel
   ├─ libsodium vault crypto (client-only keys)
   └─ Serwist service worker (offline shell + asset cache)    PaddleOCR sidecar (Python FastAPI) ◀── Laravel dispatches OCR jobs
```

Services (each a multi-stage Dockerfile, composed): `web` (Next standalone), `api` (php-fpm+nginx), `collab` (Node, Phase 3), `ocr` (Python, Phase 4), `postgres`, `redis`, `minio` (dev). Plain REST + one CRDT socket — no CQRS.

**Offline divergence from diagram:** Phase 2 offline ships **without Yjs**. Local-first persistence is **TanStack-Query cache → IndexedDB (`idbPersister`) + a paused-mutation queue + a server-side 409 optimistic-concurrency guard** (`base_updated_at`), *not* a Y.Doc. `yjs` is installed but unused — reserved for Phase 3 collaboration (`y-indexeddb` + Hocuspocus). The diagram's `Yjs + y-indexeddb` offline-doc line is a Phase-3 target, not current state.

**Note model clarification:** "notebook" is a card type whose `content.tabs` is a recursive `NotebookTab[]` page tree, edited full-screen. Vault encryption currently lives at the **notebook-card** level (`style.encrypted` + `content.ciphertext`); `Board.is_vault/vault_salt/vault_verifier` columns exist for a future **board-level** lock — reconcile in Phase 5.

---

## Design System (glassmorphism + neumorphism hybrid)

Tokens already wired as CSS vars (`--color-*`, `--glass-*`, `--nb-*`). Canonical values:
- **Palette:** primary teal `#0D9488` (dark `#2DD4BF`), accent orange `#F97316`, dual-mode surfaces (light card `#FFF`@80%, dark `#131C2B`@70%), text `#0F172A`/`#E6EDF6`, muted `#475569`/`#94A3B8`.
- **Type:** Inter (UI/body), optional Lexend headings; body ≥16px mobile, line-height 1.5–1.7.
- **Hybrid rule:** **glass** for floating overlays (sidebar, topbar, command palette, modals, toolbars — `backdrop-blur`, translucent surface, hairline border); **neumorphic** for controls on solid surfaces (tool buttons, toggles, thickness slider — dual soft shadow, inset when pressed). Canvas cards = subtle glass + soft drop shadow; selected = teal ring.
- **z-index scale:** canvas 0 · connections 5 · cards 10 · floating toolbars 30 · sidebar/topbar 40 · palette/modals 50 · toasts 60.
- **Non-negotiables:** SVG icons (Lucide) only · `cursor-pointer` on interactives · 150–300ms transform/opacity transitions · `:focus-visible` rings · `prefers-reduced-motion` · 4.5:1 contrast · `aria-live` on async status · 44px touch targets · responsive 375/768/1024/1440.

---

## Detailed Tasks by Phase

### Phase 0 — Foundations ✅ (complete)
- ✅ Laravel on PostgreSQL; Sanctum token auth; CORS; `pg_trgm` extension migration.
- ✅ Frontend deps: react-query(+devtools), zustand, zod, axios, cmdk, lucide, libsodium-wrappers-sumo, serwist, BlockNote/Mantine.
- ✅ Glass/neu design tokens, dark/light, `Sidebar`/`Topbar` base layout.
- 🟡 **Carryover:** confirm `docker-compose` has `web` + `api` + `postgres` + `redis` multi-stage Dockerfiles (verify on disk; not visible in index). ⬜ Add `.env.example` for both apps with PG/Redis/object-store vars.

### Phase 1 — MVP canvas + notes (single-user, online) ✅ (core done; hardening complete)

**Core MVP** ✅: boards/cards CRUD + optimistic hooks · infinite canvas pan/zoom/cull/drag(snap)/resize · Memo/Todo/Task/Bookmark/Notebook cards · BlockNote editor + custom callout · wiki notebook (nested pages, DnD, autosave) · command palette + command registry · bookmark unfurl · auth pages + route guard.

**Phase 1A — Media & Import** ✅:
- ✅ **Media cards** — `ImageCard`, `GifCard`, `AudioCard`, `FileCard` with renderers + progress states + retry UI.
- ✅ **Upload pipeline** — `attachments` table + `AttachmentController` store/show/destroy; Cloudflare R2 storage; `uploadCardAttachment` shared helper.
- ✅ **OS drag-and-drop import** — `useCanvasDropImport` wired to canvas drop handler.
- ✅ **Paste-from-clipboard import** — `useCanvasPaste` (image blob→image card, URL→bookmark, text→memo); toast feedback.
- ✅ **Card multi-select + group ops** — marquee select, `GroupToolbar` (move/delete/duplicate/z-order), `ShortcutsModal` (`?`-triggered).

**Phase 1B — Hardening & UX** ✅:
- ✅ **Standardized error taxonomy** — `{error:{code,message,details}}` envelope on every non-2xx; `ApiError.php` + `bootstrap/app.php` exception handlers; 422/401/403/404/405/409/500 normalization.
- ✅ **Toast system** — `toastStore` + `Toaster` (glass surface, per-level icons, auto-expire, 5-toast cap); axios interceptor routes errors to toast.
- ✅ **Confirm dialog** — `confirmStore` promise-based + `ConfirmDialog` (glass, focus-trap, Esc-cancel) for all destructive deletes.
- ✅ **Read / Edit canvas mode** — `CardPalette` mode segment (Hand/MousePointer2 pill); H/V hotkeys; mode gates marquee/delete/drag/resize/palette-content; double-click notebook open allowed in read.
- ✅ **Zod input validation** — all mutation helpers (`createCard`, `updateCard`, etc.) `parse()` before sending; auth pages `safeParse()` + inline field errors + 422 mapping.
- ✅ **Media `object-fit: cover`** — `ImageCard` / `GifCard` fill card frames without distortion; corners clipped by `CardShell` border-radius.

**Tests** 🟡:
- ✅ Pest `CardConflictTest` + factories + `AttachmentTest`.
- ✅ Vitest `uploadAttachment.test.ts` (XHR mock, progress, timeout).
- ⬜ Still owed: Board/Card/Auth CRUD; `canvasStore`, `useCardDrag`, culling; new stores (`toastStore`, `confirmStore`); `useCanvasPaste`, `useMarqueeSelect` aabb edge cases.

### Phase 2 — Offline-first PWA 🟡 → mostly ✅ (non-Yjs strategy)
Done: ✅ Serwist SW (precache + runtime asset caching + `~offline` document fallback).

- ✅ **Query persistence** — `@tanstack/react-query-persist-client` + `idbPersister` (idb-keyval, key `witsnote-rq`) wired in `providers.tsx`; boards/cards read offline (`maxAge` 7d, `buster v1`).
- ✅ **Offline mutation queue** — `registerMutationDefaults` (cards create/update/delete) + `shouldDehydrateMutation: () => true`; paused mutations rehydrate on reload and replay via `resumePausedMutations()` on cache restore. `onlineManager` uses DOM `online`/`offline` events (no polling). Sync status surfaced via `SyncStatus` (`aria-live`).
- ✅ **Backend conflict guard** — `CardController::update` returns 409 + fresh card on stale `base_updated_at`; client handles 409 → invalidate + `card:conflict` event → `SyncStatus` banner. Pest `CardConflictTest` (3 cases) + factories.
- ✅ **PWA manifest + icons + install** — `public/manifest.json`, maskable icons (192/512, `scripts/gen-icons.mjs`), `InstallPrompt` (`beforeinstallprompt`), `~offline` fallback page. ⬜ Lighthouse PWA audit (installable + offline-capable) still to run.
- ✅ **Conflict-free local edits** — chosen path = optimistic query cache + server-side 409 optimistic-concurrency guard (`base_updated_at`) + LWW fallback, *not* CRDT. Reconciles via cache invalidation on conflict.
- ⬜ **Yjs local doc** — *deferred to Phase 3*. `yjs` dep installed but unused; no `y-indexeddb`, no Y.Doc model. Will land with collab (each board a Y.Doc, cards as `Y.Map`), superseding the 409 guard for collaborative boards.

### Phase 3 — Real-time collaboration 🟡 (paused — core working, deferred until Phase 4/5 land)

**Deferred by decision, not by blocker.** Codegraph audit of the uncommitted
WIP (see "Collab bug-chase" note below) found this phase is far further
along than previously tracked here — sharing/roles, sidecar, persistence,
and presence are functional. Resume after Phase 4a + full Phase 5.

- ✅ **`collab/` sidecar** — Node + **Hocuspocus** server, running.
- ✅ **Auth bridge** — `CollabController::ticket` validates the Sanctum
  session against Laravel, issues a short-lived ticket per board.
- ✅ **Persistence** — `BoardDocument` model/migration,
  `CollabInternalController::show/store`; a `created_by` NOT-NULL/type bug
  that broke card-create → projection → attachment upload on shared boards
  (RC1-4 in `LAST_SESSION_PLAN.md`) was found and fixed.
- ✅ **Sharing model** — `BoardMember`, `BoardPolicy` (owner/editor/viewer),
  `BoardMemberController`, `ShareModal`, invite/update/remove hooks.
- ✅ **Presence/awareness** — `PresenceLayer.tsx`, `client/lib/collab/`.
- ⬜ **Comments** — `comments` table (board/card anchored, threaded) + UI —
  not started.
- ⬜ **Vault exclusion** — encrypted notebooks stay single-user (no live
  collab); guard in sidecar — not yet enforced.
- ⬜ Tests — only Pest `BoardMemberTest`/`CollabTicketTest` exist; no
  two-client convergence e2e (Playwright) yet.
- ⬜ `docker-compose` entry + multi-stage Dockerfile for `collab` service —
  confirm/add.

### Phase 4a — Sketch + fuzzy search ✅ (done — no new infrastructure)
Sketch:
- ✅ **Ink engine** — `pixi.js` v8 + `perfect-freehand`; `SketchCard` (dynamic-imported, ssr:false) shares the viewport transform via its own per-card canvas.
- ✅ **Tools** — draw, eraser (segment-distance hit-test removal, `lib/canvas/sketch.ts`), thickness, color; strokes stored as vector points in `content.strokes`.
- ✅ **Perf** — committed layer + live active-stroke overlay, redraw on commit.
- 🟡 Deviates from spec: per-card canvas, not a single full-board ink layer — simpler, avoids duplicating the viewport-transform sync logic; revisit only if a full-board layer becomes necessary for cross-card ink.

Search:
- ✅ **Upgrade to fuzzy** — `CardController::search` uses `pg_trgm` `%` + `ilike` combined, ranked by `similarity()`; GIN trigram index on `title`/`content_text`.

### Phase 4b — OCR ⬜ (deferred with Phase 3 — same "new sidecar" risk shape)
- ⬜ **`ocr/` sidecar** — Python **FastAPI + PaddleOCR**; multi-stage Dockerfile + compose entry; `/ocr` endpoint (image → text + boxes).
- ⬜ **OCR pipeline** — Laravel queues OCR on sketch/image save (Redis queue) → calls `ocr/` → writes `attachments.ocr_text` / card `content_text`; eventual-consistency status via `aria-live`.
- ⬜ **Handwritten search** — folded into the same `content_text` index so the existing palette Search tab finds it.
- ⬜ Tests — OCR integration (sample handwriting → text appears in search).

### Architecture decisions (ADRs) governing Phase 4/5

1. **Reconciliation-model boundary** — Phase 4/5 build exclusively on the
   existing REST + optimistic-cache + 409 `base_updated_at` guard. No
   Phase 4/5 feature special-cases Yjs/CRDT semantics; migrating
   collaborative boards to Y.Doc is Phase-3-resume's problem.
2. **OCR bucketed with Phase 3** — see Phase 4b above; both are "new
   service, new auth bridge" work bundled into one future infra-hardening
   pass rather than landing piecemeal.
3. **Annotate vs Comments scope split** — Phase 5 "Annotate" ships as
   position-anchored ink/pins only (`comment_anchor` card type, already in
   `CardTypeSchema`), no threaded replies. Threaded board/card comments
   remain Phase 3's deferred "Comments" item.

**Design bar for all new UI in Phase 4/5**: see the Milanote-inspired UX
strategy (personas, journeys, IA, component inventory, motion/a11y specs)
recorded in `C:\Users\vince\.claude\plans\ultra-plan-md-goal-defer-iterative-forest.md`
— extends the existing glass+neumorphism hybrid, doesn't replace it.

### Phase 5 — Templates, mind-maps, links, vault polish, export ✅ (all 9 items done)
- ✅ **Vault crypto core** — Argon2id + secretbox + verifier + session key (`lib/crypto/notebook.ts`, modals, save path).
- ✅ **Vault reconcile** — board-level lock (`BoardController::setVault`, owner-only, blocked when board has members) alongside the existing card-level notebook lock; Topbar "Lock board"/"Lock now"; `lockAllForBoard` clears both the board key and every notebook card's key; auto-relock on 15min idle (`useIdleTimer`).
- ✅ **Connections / mind-maps** — `connections` table + `ConnectionController`; drag-to-connect handle on selected cards; edges rendered as an SVG overlay (`ConnectionsLayer`) sharing the canvas's viewport-transform wrapper, not a second Pixi instance — simpler, same visual result.
- ✅ **Hyperlink between notes** — turned out to already be fully built (`@`-mention insertion, `NotebookMention` chip navigation, backlinks panel in `NotebookSidebar`); backfilled the missing test coverage (`flattenTabsForMention`, `findBacklinks`).
- ✅ **Templates** — `templates` table + `TemplateSeeder` (storyboard, weekly schedule, project plan, team plan, creative moodboard) + `TemplateController::use` clones a blueprint into a new board; `TemplateGalleryModal` ("From template" on Boards Home).
- ✅ **Task scheduling / reminders** — `reminders` table (dedup by card_id+remind_at) + `reminders:dispatch-due` scheduled command (queues `ReminderMail`); due/remind badge on any card (`lib/dates.ts`); `/tasks` agenda view (the sidebar link was previously a 404). 🟡 Web Push (VAPID + subscription UI + SW push handler) deferred — materially bigger lift than the rest of the feature; email is the "+ email" half shipped.
- ✅ **Export** — board → PNG/PDF via Topbar "Export" menu (`html-to-image` capture, embedded in a `jsPDF` page); notebook → Markdown (`lib/export/markdown.ts`). 🟡 Deviates from spec: client-side capture, not Browsershot/headless-Chrome — no Chrome binary or `spatie/browsershot` dependency exists in this environment, and that's the same "new external dependency" risk shape flagged for the OCR sidecar.
- ✅ **Tables card** — `table` card type, simple editable grid (`lib/canvas/table.ts` + `TableCard`), not a full BlockNote table block.
- ✅ **Moodboard mode** — "Moodboard" Topbar action arranges all cards into a dense uniform grid in one shot (`lib/canvas/moodboard.ts`) — a manual arrange action, not a persistent layout mode, matching Milanote's actual behavior.
- ✅ **Annotate** — `comment_anchor` card type, a bare 32x32 pin marker (`AnnotatePinCard`) that expands to a single note on click; scoped per ADR #3 (pins only, no threaded replies).

🟡 **Known issue (not fixed, flagged for follow-up):** a content-only card update (payload has no x/y/w/h) sometimes resets the card's position/size to `CreateCardSchema`'s defaults server-side. Seen on both the table and annotate-pin cards during verification; content itself always persisted correctly. Needs investigation in `CardShell.tsx`'s `localCards` merge logic or `CardController::update`.

---

## Verification

- **Per phase, end-to-end in the running PWA:** `docker compose up`, then exercise the slice (create board → add cards → reload offline → reconnect → confirm sync). Backend changes also: `php artisan migrate`, hit endpoints.
- **Backend:** `php artisan test` — Pest/PHPUnit feature tests per controller on a Postgres test DB (currently none — add as each phase lands).
- **Frontend:** Vitest + Testing Library for stores/hooks (canvas math, drag/snap, culling, crypto round-trip); Playwright e2e for canvas drag, command palette, offline reload, and (P3) two-context collab convergence.
- **OCR (P4):** integration test posts a handwriting sample to `ocr/`, asserts extracted text surfaces in search.
- **Vault:** verify ciphertext-at-rest (server never stores vault plaintext or `content_text`), and locked notebooks are absent from search until unlocked.
- **PWA/Lighthouse:** installable + offline-capable; 60fps pan with 500+ cards (culling); contrast, focus-state, `prefers-reduced-motion` audit.

## Open Items / Risks
- **Thin test coverage** — conflict-guard suite + factories landed (first tests); still highest-priority debt for frontend (Vitest/RTL) + Board/Card/Auth CRUD (Pest). Backfill alongside each phase before adding surface area.
- **Two reconciliation models** — P2 offline shipped *without* Yjs: server-side LWW + 409 version check (`base_updated_at`) is the current model; future Yjs CRDT (P3 collab) is a second model. Reconcile when collab lands — decide whether single-user boards keep the 409 path or migrate to Y.Doc.
- **Yjs + vault** — encrypted boards excluded from live collab (single-user) to avoid encrypted-CRDT complexity.
- **Vault scope drift** — card-level (`style.encrypted`) vs board-level (`Board.vault_*`) must be unified (Phase 5) to avoid two crypto paths.
- **Search** — today's `ilike` is substring-only; "fuzzy" requires the `pg_trgm` upgrade (Phase 4).
- **BlockNote (not raw Tiptap)** — satisfies the "Tiptap free libraries / Notion-like" requirement since BlockNote is Tiptap/ProseMirror-based; keep to free extensions.
- **Docker/compose** not in the code index — confirm the multi-stage builds + `collab`/`ocr` services exist or are added when their phases begin.