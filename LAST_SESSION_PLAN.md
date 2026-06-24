# Fix: Attachment upload stuck at "Uploading… 0%" forever

## Context

Dropping/adding a file (image/audio/file) creates a card with `content.status = "uploading"`,
then uploads the file, then PATCHes the card to `status: "ready"`. In practice the card stays
`{status:"uploading", progress:0}` permanently — survives page refresh / hard refresh because the
**database row was never advanced past the initial `uploading` state**.

### Root cause (high confidence)

The upload `POST /api/proxy/attachments` **hangs and never returns**, so neither the success
(`status:"ready"`) nor the catch (`status:"error"`) branch of `handleFile` ever runs. The user
refreshes repeatedly, killing the in-flight `XMLHttpRequest` each time, so the card is frozen at
`uploading` in the DB forever.

Why it hangs: `client/app/api/proxy/[...path]/route.ts` forwards multipart uploads by **buffering
the whole body** (`body = await request.arrayBuffer()`) and re-`fetch()`-ing it to Laravel. This is
the exact pattern that hangs on Next.js App Router route handlers for request bodies above
~64–100 kB, driven by:
- Node ≥ 20.4.0 undici body-forwarding regression — Next issue [#52616](https://github.com/vercel/next.js/issues/52616), [#64002](https://github.com/vercel/next.js/issues/64002).
- **Turbopack is the default dev bundler in Next 16** (`next dev`, no flag) and partially consumes the
  multipart stream before the handler runs — the proxy comment already documents this. Switching
  `formData()` → `arrayBuffer()` did NOT fix it because `arrayBuffer()` reads the same broken stream.

`AxioSpark.png` (image, >100 kB) is over the threshold → hang. Small files would pass.

### Ruled out (evidence)

- **Disk/R2 misconfig** (`config/attachments.php` defaults to `public`; `r2_*` disks have `throw=true`):
  would make `store()` throw → 500 → catch branch → card shows `status:"error"` ("Upload failed").
  Card shows `uploading`, not `error` → not this.
- **409 conflict guard** (`CardController::update`): the ready-update's `base_updated_at` matches the
  freshly-created card's `updated_at` (or is `undefined` while optimistic temp card is in cache →
  guard skipped). Not a persistent cause.
- The PATCH returning `uploading` content in the DevTools screenshot is a **card-drag position
  update** echoing the unchanged `content`, not the attachment-complete update.

## Fix

### 1. Proxy — stream the body instead of buffering (root cause)

`client/app/api/proxy/[...path]/route.ts`

- For non-GET/HEAD, forward `request.body` (a `ReadableStream`) **directly** to upstream `fetch`
  with `duplex: "half"`. Next 16's fetch supports duplex streaming natively — no buffering.
- Keep the original `content-type` (with multipart boundary) intact. Do not re-read/re-encode.
- Drop the `arrayBuffer()` branch and the `body instanceof ReadableStream` conditional for duplex
  (always set `duplex:"half"` when a stream body is present).
- Leave the IPv4 note: `UPSTREAM` already uses `localhost` — fine since other proxied calls work.

Representative shape:
```ts
let body: BodyInit | null = null;
const init: RequestInit & { duplex?: "half" } = { method: request.method, headers: forwardHeaders };
if (!["GET", "HEAD"].includes(request.method)) {
  body = request.body;            // ReadableStream — no buffering
  init.body = body;
  init.duplex = "half";
}
const upstream = await fetch(upstreamUrl, init);
```

- If streaming still hangs under Turbopack on this machine, the fallback lever is
  `next dev --webpack` (Next 16 opt-out). Capture this in `client/CLAUDE.md` rather than changing
  the default — verify streaming first.

### 2. Frontend resilience — never freeze on `uploading`

`client/features/cards/CardPalette.tsx` (`handleFileChosen`) and
`client/features/canvas/useCanvasDropImport.ts` (`handleFile`) share the identical flow.

- The `catch` already sets `status:"error"` + PATCHes it — keep. The real gap is the **hang** (no
  reject fires). `uploadAttachment` already sets `xhr.timeout = 60_000` → `ontimeout` rejects → catch
  runs. Confirm the catch's `updateCard({... status:"error"})` reliably persists so a stuck upload
  self-heals to "error" after 60 s instead of frozen `uploading`.
- Add a retry affordance: in the `error` branch of `ImageCard` / `FileCard` / `AudioCard`
  (`status === "error"`), render a "Retry" button that re-runs the upload for that card.
- Consider lowering `xhr.timeout` (e.g. 30 s) so failures surface faster.
- Factor the duplicated create→upload→update flow into one shared helper (e.g.
  `client/lib/api/uploadCardAttachment.ts`) so both call sites stay in sync. Reuse existing
  `uploadAttachment` (`client/lib/api/boards.ts:65`) and `useUpdateCard` (`client/lib/api/hooks.ts:204`).

### 3. Tests

- **Server** — extend `server/tests/Feature/AttachmentTest.php`: assert `POST /api/attachments`
  with `UploadedFile::fake()->image()` returns 201 + creates the `Attachment` row (use the `public`
  disk via `Storage::fake`). This locks the backend contract the proxy depends on.
- **Client** — add a `vitest` test (config already at `client/vitest.config.ts`) for
  `uploadAttachment`: mock `XMLHttpRequest`, assert it resolves on 201 and rejects on timeout/error.
  Optionally a route-handler test that a multipart POST forwards body + Bearer to upstream.

## Critical files

- `client/app/api/proxy/[...path]/route.ts` — proxy streaming fix (primary)
- `client/features/cards/CardPalette.tsx` — upload flow + retry
- `client/features/canvas/useCanvasDropImport.ts` — upload flow (dedupe)
- `client/lib/api/boards.ts` — `uploadAttachment` (timeout tweak)
- `client/features/cards/{ImageCard,FileCard,AudioCard,GifCard}.tsx` — error/retry UI
- `server/tests/Feature/AttachmentTest.php`, `client/vitest.config.ts` (+ new client test)

## Verification (do this FIRST to confirm root cause)

1. **Confirm the hang location.** Start Laravel (`php -d upload_max_filesize=50M -d post_max_size=60M
   artisan serve`) and Next (`pnpm dev`). Upload an image > 100 kB. Watch the Laravel console /
   `storage/logs/laravel.log`:
   - POST `/api/attachments` **never arrives** → confirms proxy body-forwarding hang (this plan).
   - Arrives + returns 201 but client stuck → re-investigate response/409 path instead.
2. Apply the proxy streaming fix. Re-upload the same image:
   - Network: `POST /api/proxy/attachments` returns 201 within ~1 s.
   - Card flips `uploading → ready`, image renders.
   - DB: `cards.content.status = "ready"` with `attachment_id`/`url`. Survives hard refresh.
3. Force-fail path: stop Laravel mid-upload (or point disk at bad R2 creds) → card lands on
   `error` with a working **Retry**, never frozen `uploading`.
4. `cd client && pnpm lint && pnpm test`; `cd server && php artisan test --filter=Attachment`.
5. If streaming hangs under Turbopack, retry with `next dev --webpack` to isolate the bundler, then
   document.

## Sources

- Next.js #52616 — fetch + formData in route handler never returns >100 kB (Node 20.4.0): https://github.com/vercel/next.js/issues/52616
- Next.js #64002 — route handler stuck on `await request.formData()`: https://github.com/vercel/next.js/issues/64002
- Next.js 16 duplex streaming proxy pattern: https://learnwebcraft.com/learn/nextjs/nextjs-16-proxy-ts-changes-everything
- Next.js 16 upgrade / `--webpack` opt-out: https://nextjs.org/docs/app/guides/upgrading/version-16