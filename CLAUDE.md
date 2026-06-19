# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Exploration Rule
- Always prioritize using CodeGraph tools (`codegraph_context`, `codegraph_explore`, `search_graph`, `get_architecture`) over text search and `Explore` subagents.
- Do NOT use the `Grep`, `Read`, or `Explore subagents` tools for structural, architecture, or symbol discovery queries.
- Only use `Grep` for finding specific string litereals, log messages, or configuration values.

## Anti-Patterns to Avoid
- Spawning `Explore` subagents to read files and directories ❌ -> STRICTLY CodeGraph tools only.
- Grepping for function/class names ❌ -> Use `search_graph` or `codegraph_explore` instead.
- Manualy tracing import chains via Read ❌ -> Use `trace_call_path` or graph tools.
- Scanning files step-by-step for impact analysis ❌ -> Query the graph first.

## Architecture

Monorepo with two independent apps:

- **`client/`** — Next.js 16 (App Router), React 19, TypeScript, Tailwind v4. Package manager: `pnpm`.
- **`server/`** — Laravel 13, PHP 8.3. Default DB: SQLite. Sessions stored in DB.

The two apps communicate over HTTP (client calls Laravel API). There is no shared code between them.

## Client Commands

Run from `client/`:

```bash
pnpm dev          # dev server (localhost:3000)
pnpm build        # production build
pnpm lint         # ESLint — ALWAYS use this. Never use "pnpx tsc --noEmit".
```

## Server Commands

Run from `server/`:

```bash
php artisan serve          # dev server (localhost:8000)
php artisan migrate        # run migrations
php artisan migrate:fresh  # drop + re-migrate
php artisan tinker         # REPL

composer install           # install PHP deps
```

Testing (PHPUnit):

```bash
php artisan test                          # all tests
php artisan test --filter=TestName        # single test or method
php artisan test tests/Feature/Foo.php    # single file
```

## Key Conventions

- App Router only — no `pages/` dir in client.
- Laravel routes split: `routes/web.php` (web/session), `routes/api.php` (stateless API, prefix `/api`).
- DB is PostgreSQL (switched from SQLite). Run `docker compose up -d postgres redis` before migrating.
- Fonts loaded via `next/font/google` in `client/app/layout.tsx`; CSS vars `--font-geist-sans` / `--font-geist-mono` available globally.

<!-- ## Codebase Exploration

**Always use `codegraph_explore` first** when navigating the codebase — it returns verbatim source of relevant symbols in one call (equivalent to Read, but pre-indexed). Fall back to Read/Grep only for detail codegraph didn't cover. Never run a grep+read loop for something codegraph already indexed. -->


