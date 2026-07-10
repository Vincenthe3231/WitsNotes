# CLAUDE.md — Root

Guidance for Claude Code across the entire monorepo.

## Code Exploration Rule

**Always use CodeGraph tools first.** The graph is pre-indexed and returns verbatim source in one call.

| Intent | Tool |
|--------|------|
| "How does X work?" / "Where is X?" / architecture | `codegraph_explore` (PRIMARY — call first, usually only call needed) |
| "What is the symbol named X?" (just location) | `codegraph_search` |
| "What calls this?" | `codegraph_callers` |
| "What does this call?" | `codegraph_callees` |
| "What breaks if I change X?" | `codegraph_impact` |
| Specific string literal / log message / config value | `Grep` (only for literals) |

**Never use `Grep`, `Read`, or `Explore` subagents for structural/symbol/architecture queries.**  
Never grep for function or class names — use `codegraph_search` or `codegraph_explore`.  
Never manually trace import chains via `Read` — use codegraph.

## Architecture

Monorepo — two fully independent apps, no shared code:

- **`client/`** — Next.js 15 (App Router), React 19, TypeScript, Tailwind v4. Package manager: `pnpm`.
- **`server/`** — Laravel 12, PHP 8.3. DB: **PostgreSQL** (not SQLite). Sessions in DB.

Client calls Laravel over HTTP. Auth uses httpOnly cookie (`wn_sid`) via a Next.js proxy route (`client/app/api/proxy/[...path]/route.ts`) — JS never sees the Bearer token directly.

## Commands

See `client/CLAUDE.md` and `server/CLAUDE.md` for full command references.

Quick reference:

```bash
# Client (run from client/)
pnpm dev          # localhost:3000
pnpm build && pnpm start   # production (required to test SW/offline)
pnpm lint         # ESLint — ALWAYS run after edits. Never use tsc --noEmit.

# Server (run from server/)
php artisan serve              # localhost:8000
docker compose up -d postgres redis   # must be running before migrate
php artisan migrate
php artisan test
```

## Key Conventions

- **App Router only** — no `pages/` dir.
- **DB is PostgreSQL** — run `docker compose up -d postgres redis` before any migration.
- Laravel routes: `routes/web.php` (web/session), `routes/api.php` (prefix `/api`).
- Fonts via `next/font/google` in `client/app/layout.tsx`; CSS vars `--font-geist-sans` / `--font-geist-mono` available globally.
- **Service Worker only runs in production build** (`disable: NODE_ENV !== "production"`). To test offline/PWA: `pnpm build && pnpm start`.

## Standardized Error Contract

Every non-2xx API response has the same envelope:

```json
{
  "error": {
    "code": "string_snake_case",
    "message": "human readable",
    "details": { } | null
  }
}
```

HTTP status preserved (not duplicated in body). Backend routes exceptions via `ApiError::render()` in `bootstrap/app.php`. Frontend axios interceptor normalizes to `ApiError` class + routes to handlers (422→inline, 401→redirect+toast, others→toast, 409→SyncStatus). See `server/CLAUDE.md` and `client/lib/api/CLAUDE.md` for full contract + routing table.

## Offline-PWA (feat/offline-PWA branch)

- Query persistence via `PersistQueryClientProvider` + `idbPersister` (IndexedDB, key `witsnote-rq`).
- Mutation defaults registered via `registerMutationDefaults(qc)` in `client/lib/api/hooks.ts` — required for paused-mutation rehydration across reload.
- `onlineManager` uses DOM events only (`online`/`offline`) — **no polling interval**. Do not add `setInterval` back.
- Conflict guard: `CardController::update` returns 409 when `base_updated_at` is stale.
- See `client/lib/api/CLAUDE.md` for offline mutation pattern details.

## Collab sidecar debug

`collab/` (Hocuspocus/Yjs sidecar) has no Telescope-equivalent by default — it's a
separate Node process, not covered by Laravel's Telescope. Debug inspector at
`http://localhost:1234/__debug` (dashboard) and `/__debug/events.json` (raw feed)
shows every hook call (`onAuthenticate`, `onLoadDocument`, `onStoreDocument`,
`onDisconnect`, `storeYDoc`) with status/duration; events also stream to stdout as
`[collab:debug]` lines. See `collab/src/inspector.ts` and `collab/README.md`.
