# WitsNote — Milanote-like Note-taking PWA: Architecture & Phased Build Plan

## Context

Building **WitsNote**, an offline-capable PWA for visual note-taking on an infinite canvas (Milanote-like) with extra power features: rich-text memos (Notion-like), freehand sketching, mind-maps, task scheduling, templates, real-time collaboration, fuzzy + handwritten search, and password-locked notebooks. The repo is a fresh greenfield: `client/` is a clean Next.js 16 / React 19 / Tailwind v4 scaffold (pnpm), `server/` is a clean Laravel 13 (PHP 8.3) scaffold. Nothing feature-related is implemented yet.

Decisions locked with the user:
- **Backend:** Laravel 13 REST API on **PostgreSQL** (Eloquent — *Prisma dropped*, it cannot drive Laravel). Next.js is frontend-only and talks to Laravel via tanstack-query.
- **Realtime + offline:** **Yjs CRDT**, offline-first (IndexedDB persistence, WebSocket sync). Laravel cannot host a Yjs socket server, so a small **Node "collab" sidecar** (Hocuspocus) is added purely for the Yjs transport, authenticated against Laravel.
- **Notebook cryptography:** **per-notebook password lock** — content encrypted with a key derived from the notebook password (extra access layer), opt-in per notebook (a "vault").
- **Scope:** **phased roadmap, MVP first.** Full architecture + design system up front; features delivered in slices.
- **Constraints (user):** no heavy patterns (no CQRS/event-sourcing); hybrid glassmorphism + neumorphism aesthetic; performance-first infinite canvas; WebGPU only where it earns its place.

The requested skills map to workstreams: `/nextjs-developer` + `/typescript-pro` → frontend; `/architecture` + `/system-design` → service/data design (this doc); `/feature-forge` + `/write-spec` → per-feature specs (Phase docs); `/ui-ux-pro-max` → design system (below).

---

## 1. Service Architecture (no exotic patterns — plain REST + a CRDT socket)

```
                         ┌─────────────────────────────────────────┐
                         │  Browser PWA (Next.js 16, installable)    │
                         │  - tanstack-query (server cache)          │
                         │  - zustand (canvas/UI local state)        │
                         │  - zod (shared request/response schemas)  │
                         │  - Yjs + y-indexeddb (offline doc store)  │
                         │  - service worker (Serwist) asset cache   │
                         └───────┬───────────────────┬───────────────┘
                  REST/JSON (Sanctum token)          │ WebSocket (Yjs updates)
                                 │                    │
                  ┌──────────────▼─────────┐   ┌──────▼─────────────────┐
                  │  Laravel 13 API (PHP)  │   │  Collab sidecar (Node) │
                  │  - auth (Sanctum)      │   │  - Hocuspocus server   │
                  │  - notebooks/cards CRUD │   │  - validates Sanctum   │
                  │  - search, templates    │   │    token w/ Laravel    │
                  │  - file uploads         │   │  - persists Yjs binary │
                  │  - queues OCR/export    │   │    to Postgres + Redis │
                  └───┬───────┬────────┬────┘   └──────┬─────────────────┘
                      │       │        │ HTTP          │
        ┌─────────────▼┐  ┌───▼────┐  ┌▼──────────────▼┐  ┌──────────────┐
        │ PostgreSQL   │  │ Redis  │  │ OCR sidecar    │  │ Object store │
        │ (data +      │  │ queue/ │  │ (Python +      │  │ (S3 / MinIO  │
        │  pg_trgm FTS)│  │ cache/ │  │  FastAPI +     │  │  media,      │
        │              │  │ presence│ │  PaddleOCR)    │  │  exports)    │
        └──────────────┘  └────────┘  └────────────────┘  └──────────────┘
```

**Five containers** orchestrated by `docker-compose`, each a **multi-stage Dockerfile**: `web` (Next standalone), `api` (php-fpm + nginx), `collab` (Node), `ocr` (Python), plus `postgres`, `redis`, `minio` (dev). Keep it boring on purpose — REST + a single CRDT socket, no CQRS.

---

## 2. Tech Stack → Role

| Concern | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js 16 App Router, React 19 | already scaffolded in `client/` |
| Server state | `@tanstack/react-query` + `@tanstack/react-query-devtools` | REST cache, persisted to IndexedDB for offline reads |
| Client state | `zustand` | canvas viewport, selection, tool state, command palette |
| Validation | `zod` | shared schemas for API DTOs + form validation; infer TS types |
| Rich text | **Tiptap** (free/MIT extensions only) | memo editor; StarterKit, Table, Link, Image, TaskList, Placeholder, CodeBlock |
| Infinite canvas | **custom DOM-virtualized canvas** + **PixiJS v8** ink/lines layer | PixiJS v8 auto-selects **WebGPU**, falls back to WebGL — covers the "WebGPU if needed" requirement (§5) |
| Sketch strokes | `perfect-freehand` | pressure/thickness; stored as vector points (scalable + OCR-able) |
| Realtime | **Yjs** + `y-indexeddb` + `y-protocols`; **Hocuspocus** server | CRDT merge, offline queue, presence/awareness |
| PWA / offline | **Serwist** (`@serwist/next`) | service worker, precache, runtime caching, offline fallback |
| Backend | Laravel 13, PHP 8.3, Sanctum | REST API, queues, policies |
| ORM/DB | Eloquent + **PostgreSQL** | `pg_trgm` for fuzzy search; switch default driver off sqlite |
| OCR | **PaddleOCR** in a FastAPI Python service | printed + handwritten text extraction for search index |
| Crypto | `libsodium-wrappers` (client) | Argon2id KDF + `crypto_secretbox` for vault notebooks |
| Export | server-side (Browsershot/Spatie or `dompdf`) + client PNG via canvas | PDF / PNG / Markdown |

---

## 3. Core Data Model (Eloquent / Postgres — flat, no event store)

Primary tables (UUID PKs):
- `users`, `personal_access_tokens` (Sanctum).
- `workspaces` → `workspace_members` (role: owner/editor/commenter/viewer) — powers team plans + sharing.
- `boards` (the infinite canvas; belongs to workspace; `parent_board_id` nullable for nested boards/columns; `is_vault` bool, `vault_salt`, `vault_verifier` for password-locked).
- `cards` — polymorphic canvas element. Columns: `board_id`, `type` (`note|todo|task|bookmark|image|file|audio|gif|sketch|mindmap_node|table|column|comment_anchor`), `x`, `y`, `w`, `h`, `z`, `rotation`, `style` (jsonb), `content` (jsonb — Tiptap doc / stroke set / table model), `content_text` (extracted plaintext for search), `due_at`, `remind_at`, `created_by`.
- `connections` — `board_id`, `from_card_id`, `to_card_id`, `kind` (`arrow|line|link`), `style` (jsonb) — mind-map/flow edges.
- `card_links` — hyperlink between notes (`from_card_id` → `to_board_id`/`to_card_id`).
- `attachments` — `card_id`, `disk`, `path`, `mime`, `size`, `ocr_status`, `ocr_text`.
- `yjs_documents` — `board_id`, `state` (bytea snapshot), `updated_at` (Hocuspocus persistence target).
- `templates` — `scope` (`system|workspace`), `category` (`storyboard|weekly_schedule|project_plan|team_plan|creative|...`), `name`, `preview_url`, `doc` (jsonb board+cards blueprint).
- `reminders` — `card_id`, `user_id`, `remind_at`, `channel`, `sent_at` (queued job fires push/email).
- `comments` — `card_id`/`board_id`, `body`, threaded.

**Search:** a `search_documents` materialized projection (or a `tsvector` + `pg_trgm` GIN index on `cards.content_text`) updated on card save and after OCR completes. Fuzzy = `pg_trgm` similarity; handwritten = OCR text folded into the same `content_text`.

---

## 4. Design System (glassmorphism + neumorphism hybrid)

From `ui-ux-pro-max` (style: *Micro-interactions* — excellent perf, good a11y; spatial/glass typography). Tokens as CSS variables + Tailwind v4 `@theme`.

**Palette** (teal focus + orange action; dual mode):
| Role | Light | Dark |
|---|---|---|
| Primary | `#0D9488` (teal-600) | `#2DD4BF` (teal-400) |
| Secondary | `#14B8A6` | `#5EEAD4` |
| CTA / accent | `#F97316` (orange-500) | `#FB923C` |
| Canvas bg | `#F0FDFA` → `#E8EEF2` | `#0B1220` → `#0E1726` |
| Surface (card) | `#FFFFFF` @ 80% | `#131C2B` @ 70% |
| Text | `#0F172A` | `#E6EDF6` |
| Muted text | `#475569` (≥ slate-600) | `#94A3B8` |

**Typography:** **Inter** (300/400/500/600) for UI + body (legible, glass-friendly, system feel); optional **Lexend** for headings. Body ≥16px mobile, line-height 1.5–1.7.

**Hybrid elevation rules** (the core aesthetic):
- **Glass** for *floating overlays* over the canvas: sidebar, top bar, command palette, toolbars, modals, context menus. `backdrop-blur-xl`, `bg-surface/70–80` (light ≥80% per a11y), `border border-white/15` (dark) / `border-slate-200` (light), 1px inner highlight.
- **Neumorphic** for *interactive controls on solid surfaces*: tool buttons, toggles, slider thumbs (sketch thickness), template tiles. Dual soft shadow `shadow-[6px_6px_12px_rgba(0,0,0,.12),-6px_-6px_12px_rgba(255,255,255,.55)]`; pressed state inverts to inset.
- **Cards on canvas:** subtle glass + 1 soft drop shadow; selected = teal ring + lifted shadow.
- Elevation/z-index scale: canvas `0`, cards `10`, connection layer `5`, floating toolbars `30`, sidebar/topbar `40`, command palette/modals `50`, toasts `60`.

**Non-negotiables (from skill checklist):** SVG icons only (Lucide), `cursor-pointer` on all interactives, 150–300ms `transform/opacity` transitions, `:focus-visible` rings, `prefers-reduced-motion` honored, 4.5:1 contrast, `aria-live` on async status, 44px touch targets, responsive at 375/768/1024/1440.

---

## 5. Infinite Canvas & WebGPU Strategy (performance-first)

Two cooperating layers sharing one pan/zoom transform (`zustand` viewport: `{x, y, scale}`):
1. **DOM layer (cards):** absolutely-positioned card components, **culled to viewport + margin** (only render visible cards — virtualization rule: don't `map` everything). Pan/zoom via a single CSS `transform: translate()/scale()` on a wrapper (GPU-composited; never animate `width/height`). Tiptap editors mount only for the focused/visible card; memoize card components (`memo`, primitive deps).
2. **GPU layer (PixiJS v8):** a single canvas under the cards rendering **sketch ink, connection arrows/lines, and moodboard textures**. PixiJS v8 picks **WebGPU when available, WebGL otherwise** — satisfies "implement WebGPU if needed" without hand-writing WGSL. Strokes drawn from `perfect-freehand` points; redraw only dirty regions.

Targets: 60fps pan/zoom with 1k+ cards via culling + transform compositing; sketch input latency minimized by drawing the active stroke on a lightweight overlay then committing to the Pixi scene. Heavy modules (`tiptap`, `pixi.js`, sketch engine, OCR upload) **dynamically imported** (`next/dynamic`, `ssr:false`).

---

## 6. Feature → Implementation Map

| Feature | How |
|---|---|
| Visual drag-and-drop canvas | DOM card layer + pointer drag, snapping, marquee select; `zustand` selection store |
| Task scheduling (to-do, reminder, bookmark) | `cards.type=todo/task/bookmark`, `due_at`/`remind_at`; `reminders` table + queued job → web push/email |
| Memo (media, hyperlink, diagrams) | Tiptap doc with Image/Link/Table; embeds via attachment + oEmbed; diagrams via mind-map nodes/connections |
| Sketch (draw/eraser/thickness) | `perfect-freehand` + Pixi layer; thickness = neumorphic slider; eraser = stroke hit-test removal |
| Templates (storyboard, weekly, project, team) | `templates` table seeded; "use template" clones blueprint `doc` into a new board |
| Offline access | Serwist precache + runtime cache; Yjs `y-indexeddb`; tanstack-query persisted cache; queued mutations replay on reconnect |
| Fuzzy + handwritten search | `pg_trgm` over `content_text`; handwriting → PaddleOCR → folded into `content_text` |
| Embed media / GIF / audio | `attachments` + typed cards; `<audio>`/`<video>`/`<img>` renderers; GIF as image card |
| Tables (Excel-like) | Tiptap Table extension; equations as a later "formula cell" enhancement (Phase 5+, not MVP) |
| Annotate on notes | Pixi ink overlay + comment-anchor cards pinned to coordinates |
| Hyperlink between notes | `card_links`; clicking navigates board/card; backlink panel |
| Moodboard | image-card grid mode + glass framing + Pixi texture bg |
| Mind-maps | `connections` edges + auto-layout (elk.js) optional |
| Online collab | Yjs/Hocuspocus shared board doc; awareness cursors; presence via Redis |
| Notebook cryptography | per-board password → Argon2id key → `crypto_secretbox` encrypt card content client-side before sync; server stores ciphertext; vault excluded from server search/OCR/live-collab until unlocked |
| Export note | server PDF (Browsershot) / Markdown; client PNG of board region |
| Drag & drop elements | unified pointer system; drag from sidebar palette + OS file drop → upload |
| Shortcuts + command palette | `zustand` command registry; `cmdk`-style palette (glass); shortcuts sheet modal |

---

## 7. Repository Layout

```
WitsNote/
├─ client/            # Next.js PWA (exists) — add features/, lib/, stores/, hooks/
├─ server/            # Laravel API (exists) — switch DB to pgsql, add domain modules
├─ collab/            # NEW: Node Hocuspocus Yjs server
├─ ocr/               # NEW: Python FastAPI + PaddleOCR service
├─ packages/shared/   # NEW: zod schemas + TS types shared by client (and codegen for PHP DTO checks)
├─ docker/            # per-service multi-stage Dockerfiles
└─ docker-compose.yml # web, api, collab, ocr, postgres, redis, minio
```

`client/` frontend structure: `app/(canvas)/board/[id]`, `features/{canvas,sketch,memo,search,templates,collab,vault}`, `stores/` (zustand), `lib/api` (tanstack-query hooks + zod), `lib/yjs`, `lib/pwa`.

---

## 8. Phased Roadmap (MVP first)

**Phase 0 — Foundations (infra)**
- Switch Laravel to PostgreSQL; configure Sanctum SPA auth; CORS; `pg_trgm` migration.
- Frontend deps: react-query (+devtools), zustand, zod, tailwind theme tokens, Lucide, Serwist PWA shell + manifest + icons.
- Base layout: glass sidebar + topbar, dark/light, design tokens wired.
- `docker-compose` with `web`, `api`, `postgres`, `redis` (multi-stage Dockerfiles).

**Phase 1 — MVP canvas + notes (single-user, online)**
- Boards + cards CRUD (Laravel) with zod-typed react-query hooks.
- Infinite canvas: pan/zoom, viewport culling, drag/resize/select, snapping.
- Tiptap memo card (text, headings, lists, links, images, tables).
- To-do / bookmark cards; drag-drop from palette + OS file upload to MinIO/S3.
- Command palette + shortcuts sheet.

**Phase 2 — Offline-first PWA**
- Serwist precache + runtime caching + offline fallback; installability.
- tanstack-query persisted cache; mutation queue + replay on reconnect.
- Yjs document per board with `y-indexeddb` (local-first single-user first).

**Phase 3 — Realtime collaboration**
- `collab/` Hocuspocus sidecar; Sanctum-token auth; persist Yjs to `yjs_documents` + Redis presence.
- Awareness cursors/selections; comments; share + workspace roles.

**Phase 4 — Sketch + search (incl. OCR)**
- PixiJS v8 ink layer (WebGPU/WebGL), `perfect-freehand`, eraser, thickness slider.
- `ocr/` PaddleOCR FastAPI service; Laravel queue dispatches OCR on sketch/image save.
- Fuzzy + handwritten search over `content_text` (`pg_trgm`).

**Phase 5 — Templates, mind-maps, vaults, export**
- Template library + apply/clone; weekly/project/team blueprints seeded.
- Mind-map connections + optional auto-layout; moodboard mode.
- Per-notebook password vault (libsodium Argon2id + secretbox); export PDF/PNG/MD.
- Stretch: Excel-like formula cells; audio notes.

---

## 9. Verification

- **Per phase, end-to-end:** `docker compose up`, then exercise the slice in the running PWA (create board → add cards → reload offline → reconnect → confirm sync).
- **Backend:** Laravel feature tests (Pest/PHPUnit) for each REST module; Postgres test DB.
- **Frontend:** component/interaction tests (Vitest + Testing Library); Playwright e2e for canvas drag, command palette, offline reload, multi-tab collab (two browser contexts editing one board → converge).
- **OCR:** integration test posting a sample handwriting image to `ocr/`, asserting extracted text appears in search results.
- **PWA/Lighthouse:** installable, offline-capable, performance budget on canvas (60fps pan with 500+ cards), `prefers-reduced-motion`, contrast and focus-state audit per the design checklist.
- **Vault:** verify ciphertext-at-rest (server never sees plaintext for vault boards) and that locked boards are excluded from the search index until unlocked.

---

## Open Items / Risks
- **Yjs + vault crypto** conflict: live collab on an encrypted board needs encrypted CRDT updates — Phase 5 vaults are scoped **single-user (no live collab)** to avoid complexity; revisit if shared encrypted boards are required.
- **Tiptap licensing:** use only free/MIT extensions (no Tiptap Pro tables/AI). Confirmed in stack map.
- **OCR cost/latency:** PaddleOCR runs async via queue; search updates eventually-consistent after OCR completes (acceptable, surfaced via `aria-live` status).
- **`server/` Laravel default is sqlite** — Phase 0 must repoint `config/database.php` + `.env` to pgsql before any data work.