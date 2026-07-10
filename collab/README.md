# collab/ — WitsNote collaboration sidecar

Node + [Hocuspocus](https://tiptap.dev/docs/hocuspocus) server that relays Yjs
document updates and awareness (presence) for **shared boards only**. Single-user
boards never connect here — they stay on the REST + 409 + offline-queue path.

Phase 3 runs **exactly one always-on instance** (no Redis). See
`PLAN.md` / the Phase 3 proposal for the full architecture and PR sequence.

## Develop

```bash
cd collab
npm install
cp .env.example .env
npm run dev          # tsx watch — http://localhost:1234 (health: /health)
```

## Build / run (prod)

```bash
npm run build && npm start
# or
docker build -t witsnote-collab .
docker run -p 1234:1234 witsnote-collab
```

Health check: `GET http://localhost:1234/health` → `{"status":"ok",...}`.

## Debug inspector

`GET http://localhost:1234/__debug` — Telescope-equivalent dashboard for this
sidecar. Polls `/__debug/events.json` every 2s and lists the last 200 hook
calls (`onAuthenticate`, `onLoadDocument`, `onStoreDocument`, `onDisconnect`,
`storeYDoc`) with document, user, role, status, and duration. Every event is
also written to stdout as a structured `[collab:debug]` line for real-time
tailing via `docker logs` / terminal. No auth — assumes the collab port isn't
publicly exposed; gate behind the `X-Collab-Secret` pattern (see
`CollabInternalAuth.php`) before exposing beyond the internal network.

## Status

- **PR0 (this):** skeleton — health check, in-memory docs, no auth, no persistence.
- **PR1:** `onAuthenticate` verifies per-board JWT ticket from Laravel.
- **PR2:** `onLoadDocument` / `onStoreDocument` ↔ Laravel internal `/ydoc` endpoint
  (CRDT blob + one-way projection into the `cards` table).

## Deployment

One persistent, always-on instance with native WebSocket support, pinned to a
single replica (no Redis yet). Fly.io or a small VPS running the compose service
are the recommended targets; avoid idle-spin-down free tiers (they drop sockets).
Add Redis + scale out only when concurrent load demands it.
