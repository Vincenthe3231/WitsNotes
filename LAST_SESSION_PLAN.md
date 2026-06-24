# WitsNote — Phase 1 Finish & Hardening Plan

## Context

PLAN.md was last drafted against an older snapshot and is **materially stale**. A fresh codegraph audit shows nearly every "remaining Phase-1" canvas item is **already shipped and wired**:

| PLAN.md said | Reality (codegraph) |
|---|---|
| ⬜ multi-select + marquee | ✅ `useMarqueeSelect.ts` + `marquee` state + overlay in `CanvasLayer` |
| ⬜ group ops (del/dup/z-order) | ✅ `GroupToolbar.tsx` (delete, duplicate, bring-to-front, send-to-back) |
| ⬜ group move | ✅ `useCardDrag.onGroupMoveEnd` + `CardShell.handleGroupMoveEnd` |
| ⬜ shortcuts cheatsheet | ✅ `ShortcutsModal.tsx` (`?` trigger) + `useCanvasKeyboard.ts` |
| 🟡 OS drag-drop import | ✅ `useCanvasDropImport` wired to `InfiniteCanvas` `onDrop` |

So the **true remaining Phase-1 work** is hardening + one net-new feature + targeted UX, driven by the user's five constraints. Goal: kill "ghost bugs" via a standardized error taxonomy, push Zod to a single source of truth, finish the import story (paste), add a read/edit interaction mode, guard destructive deletes, fix media fit, and backfill the thin test layer.

**Stack (locked):** Next.js + React 19 + TanStack Query + Zod + zustand (client) · Laravel + PostgreSQL + Eloquent (server). No CQRS, no event sourcing, no new abstractions. Glassmorphism overlays + neumorphic controls.

**Design non-negotiables (carry into every new component):** Lucide SVG icons · `cursor-pointer` on interactives · 150–300ms opacity/transform transitions · `:focus-visible` rings · `prefers-reduced-motion` · 4.5:1 contrast · `aria-live` on async status · 44px touch targets. **z-index scale:** cards 10 · floating toolbars 30 · sidebar/topbar 40 · palette/modals 50 · toasts 60. **Tokens only** (`--color-primary`, `--color-surface`, `--color-surface-glass`, `--glass-bg-light`, `--glass-border`, `--glass-blur`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-warning`) — no new tokens invented.

---

## Workstream 1 — Standardized Error Taxonomy  *(architecture · laravel · nextjs)*

**The contract** (single shape, every non-2xx API response):

```json
{ "error": { "code": "string_snake_case", "message": "human readable", "details": { } | null } }
```

HTTP status is preserved (not duplicated in body). `details` carries the per-case payload (validation field map, conflict's fresh card, etc.).

### 1a. Backend — normalize in `bootstrap/app.php`
Stay lean: do it inside the existing `withExceptions(...)` closure with `$exceptions->render(...)` callbacks — **no custom middleware, no global Handler class**. Keep the existing `shouldRenderJsonWhen(api/*)`.

Map exceptions → envelope + status:
- `ValidationException` → **422**, `code: "validation_failed"`, `details: $e->errors()` (field → string[] map).
- `AuthenticationException` → **401**, `code: "unauthenticated"`.
- `AuthorizationException` / policy denial → **403**, `code: "forbidden"`.
- `ModelNotFoundException` + `NotFoundHttpException` → **404**, `code: "not_found"`.
- `MethodNotAllowedHttpException` → **405**, `code: "method_not_allowed"`.
- Fallback → **500**, `code: "server_error"`, generic message (never leak trace in prod; include `details` only when `config('app.debug')`).

Add one tiny enum-like helper `app/Support/ApiError.php` (a static `render(code, message, status, details)` returning `JsonResponse`) so controllers and the exception callbacks share one builder. No interface, no DI — a plain static class.

### 1b. Backend — conflict path (`CardController::update`)
Currently returns the raw fresh card with 409 (`server/app/Http/Controllers/CardController.php:78`). Standardize to the envelope:
```php
return ApiError::render('card_conflict', 'Card was modified elsewhere.', 409, ['current' => $card]);
```
Safe: the client 409 handler only reads `status` today (`hooks.ts:158`), so moving the card under `details.current` breaks nothing and lets us surface remote state later.

### 1c. Frontend — axios interceptor in `lib/api/client.ts`
Add a **response interceptor** (the file currently has none):
- On error, run `res.data` through `ApiErrorSchema.safeParse`. On success, throw a typed `ApiError` (class: `code`, `message`, `details`, `status`). On parse failure (HTML 500 page, network error, timeout), synthesize `ApiError("network_error" | "server_error", …)`.
- Re-reject so TanStack Query `onError` still fires. **No UI side-effects inside the interceptor itself except a single dispatch** to the toast store (Workstream 2) for "global" levels.
- Routing by status:
  - **422** → do **not** toast; attach `details` to the thrown `ApiError` so forms read field errors inline.
  - **401** → clear auth + redirect (reuse `useAuthGuard` path) — toast "Session expired".
  - **403 / 404 / 5xx / network** → toast (`error`).
  - **409** → keep existing `card:conflict` CustomEvent → `SyncStatus` banner (no duplicate toast).

### 1d. Zod — `ApiErrorSchema` in `lib/api/schemas.ts`
```ts
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullish().transform(v => v ?? null),
  }),
});
```
Derive `ApiErrorBody = z.infer<…>`.

**Critical files:** `server/bootstrap/app.php`, new `server/app/Support/ApiError.php`, `server/app/Http/Controllers/CardController.php`, `client/lib/api/client.ts`, `client/lib/api/schemas.ts`.

---

## Workstream 2 — Toast System  *(ui-ux-pro-max · nextjs)*

No notification system exists today (only `SyncStatus` aria-live + `CommandPalette`). Add a minimal one, mirroring the `commandStore` pattern.

- **`client/stores/toastStore.ts`** (zustand): `Toast = { id, level: 'error'|'warning'|'info'|'success', message, ttl }`; `push(toast)`, `dismiss(id)`; auto-expire via `setTimeout` in `push`. Map-or-array of toasts. No persistence.
- **`client/components/ui/Toaster.tsx`**: fixed bottom-right stack, **z-60**, glass surface (`--color-surface-glass` + `backdrop-blur`, `--glass-border` hairline). `aria-live="assertive"` for `error`, `"polite"` otherwise. Per-level Lucide icon + color (`--color-warning` for warning, danger for error, `--color-primary` for info). Neumorphic dismiss `X` button (44px hit area). 150–300ms enter/exit; respect `prefers-reduced-motion`.
- **Mount** once in `client/app/providers.tsx` (alongside `CommandPalette`).
- Interceptor (1c) calls `useToastStore.getState().push(...)` — store read outside React is fine for zustand.

**Critical files:** new `client/stores/toastStore.ts`, new `client/components/ui/Toaster.tsx`, `client/app/providers.tsx`.

---

## Workstream 3 — Maximize Zod  *(nextjs)*

Responses are already `.parse()`d everywhere (`boards.ts`, `auth.ts`) — good. Close the input/form gaps:

- **Pre-flight input validation** in `lib/api/boards.ts`: `.parse(input)` with `CreateCardSchema` / `UpdateCardSchema` / `CreateBoardSchema` before POST/PATCH (today they're TS-typed only). Catches malformed optimistic payloads before they hit the network.
- **Schema-driven auth** in `lib/api/auth.ts`: parse args with `LoginSchema` / `RegisterSchema` before the request.
- **Auth forms** (`client/app/auth/login`, `client/app/auth/register` — verify exact paths): replace manual checks with `safeParse`, map `error.flatten().fieldErrors` to inline field messages; on submit, map a thrown **422** `ApiError` (`details`) to the same field slots. Single source of truth = the Zod schema.

**Critical files:** `client/lib/api/boards.ts`, `client/lib/api/auth.ts`, auth page components.

---

## Workstream 4 — Paste-from-Clipboard Import  *(nextjs · feature-forge)*

The one net-new feature. Extend `client/features/canvas/useCanvasDropImport.ts` (or sibling `useCanvasPaste.ts`) with an `onPaste(ClipboardEvent)`:
- **Image blob** in `clipboardData.files` / `items` → reuse existing `handleFile(file, x, y)`; position at `canvasCenter(viewport)` (no cursor on paste).
- **Text that is a URL** → create a `bookmark` card at center (reuse the bookmark/unfurl flow; `BookmarkCard` already live-unfurls).
- Reuse `mimeToCardType`, `uploadCardAttachment`, `canvasCenter` — no new upload code.
- Wire a `paste` listener in `InfiniteCanvas` (window-level, guarded by `isInputFocused()` from `useCanvasKeyboard` so editor pastes are untouched).
- **Gated by edit mode** (Workstream 5).
- Update `ShortcutsModal` GROUPS: add `Cmd/Ctrl+V → Paste image / link`.

**EARS:** *When the user pastes while the canvas (not an input) is focused and mode is edit, the system shall create an image card from a clipboard image or a bookmark card from a clipboard URL, centered in the viewport.*

**Critical files:** `client/features/canvas/useCanvasDropImport.ts`, `client/features/canvas/InfiniteCanvas.tsx`, `client/components/ui/ShortcutsModal.tsx`.

---

## Workstream 5 — Read / Edit Canvas Mode  *(architecture · ui-ux-pro-max · feature-forge)*

**Read** = roam only (pan + zoom). **Edit** = full interaction. Default `edit`.

- **State:** add `mode: 'read' | 'edit'` + `setMode` to `client/stores/canvasStore.ts`.
- **Gating (guard at the gesture source, not by unmounting):**
  - `useCanvasPointer` — read: pan/zoom only; shift-drag marquee disabled.
  - `useMarqueeSelect` — `onPointerDown` returns `false` in read.
  - `CardShell` — read: `handleClick` selection off, header drag off (`cursor: default`), resize handles hidden, inline delete + title-edit hidden. **Keep** double-click → open notebook (read-friendly).
  - `useCanvasKeyboard` — read: ignore Delete/Backspace, Cmd+A, Cmd+D; keep `?`; add mode hotkeys.
  - `GroupToolbar` — returns null in read (selection stays empty anyway).
  - `CardPalette` — hidden in read.
  - Drop-import + paste (W4) — no-op in read.
- **Toggle UI:** neumorphic segmented control (Lucide `Hand` / `MousePointer2`), floating top-left (**z-30**), inset-shadow on the active segment. Keyboard: `H` → read, `V` → edit (Figma idiom) via `useCanvasKeyboard`. Register both as `CommandPalette` commands. Add a "Mode" group to `ShortcutsModal`.

**EARS:** *While in read mode, the system shall permit only pan and zoom and shall ignore selection, drag, resize, delete, creation, and import gestures.*

**Critical files:** `client/stores/canvasStore.ts`, `useCanvasPointer.ts`, `useMarqueeSelect.ts`, `useCanvasKeyboard.ts`, `CardShell.tsx`, `GroupToolbar.tsx`, `CardPalette.tsx`, new `client/features/canvas/ModeToggle.tsx`, `ShortcutsModal.tsx`.

---

## Workstream 6 — Delete Confirmation  *(ui-ux-pro-max)*

Today all three delete paths fire immediately: `CardShell` trash button (`CardShell.tsx:258`), `GroupToolbar.handleDelete`, `useCanvasKeyboard` Delete/Backspace. Add a confirm gate.

- **`client/stores/confirmStore.ts`** — promise-based: `confirm({ title, message, danger }) → Promise<boolean>`; holds one pending request + resolver.
- **`client/components/ui/ConfirmDialog.tsx`** — glass dialog mirroring `ShortcutsModal` (backdrop blur, `role="dialog" aria-modal`, focus trap, Esc cancels, **z-50**). Destructive confirm button in danger color; neumorphic Cancel; **Cancel autofocused**; 44px targets; `prefers-reduced-motion`. Mounted once in `providers.tsx`.
- **Wire:** each delete path becomes `if (await confirm({ danger: true, message })) { removeLocalCard; deleteCard }`. Group delete message is count-aware: *"Delete N cards? This can't be undone."*

**Critical files:** new `client/stores/confirmStore.ts`, new `client/components/ui/ConfirmDialog.tsx`, `client/app/providers.tsx`, `CardShell.tsx`, `GroupToolbar.tsx`, `useCanvasKeyboard.ts`.

---

## Workstream 7 — Media `object-fit: cover`  *(ui-ux-pro-max)*

`ImageCard.tsx` (and `GifCard` which composes it) render uploaded media. Ensure the media element fills the card frame without distortion:
```
width: 100%; height: 100%; object-fit: cover; display: block;
```
The card already clips (CardShell inner `overflow:hidden`, `borderRadius:12`). Optional `style.fit` escape hatch (`cover` default, `contain` opt-in) read from `card.style`. Verify current `<img>` style in `client/features/cards/ImageCard.tsx` and adjust.

**Critical files:** `client/features/cards/ImageCard.tsx` (+ `GifCard.tsx` if it sets its own fit).

---

## Workstream 8 — Tests Backfill  *(test-master · feature-forge acceptance)*

**Vitest / RTL** (only `cull.test.ts` exists):
- `canvasStore` — select/multi-toggle, `setSelection`, `setMode`, `localCards` upsert/remove.
- `useCardDrag` — `snap()` rounding + group-move delta math.
- `useMarqueeSelect.aabbIntersects` — hit/miss edges.
- `useCanvasKeyboard` — mode-gated + confirm-gated branches.
- `GroupToolbar` — bring-to-front / send-to-back z math.
- `toastStore` (push/expire/dismiss), `confirmStore` (resolve true/false).
- `ApiError` normalization — interceptor maps 422/404/409/500/network correctly.
- paste handler — image blob → image card; URL text → bookmark card.

**Pest** (have `CardConflictTest`, `AttachmentTest` + factories):
- Board CRUD + `BoardPolicy` (owner-only).
- Card CRUD + policy.
- Auth — register / login / logout / me.
- **Error envelope** — assert the `{error:{code,message,details}}` shape and status for 422, 403, 404, 409.

---

## Workstream 9 — Update PLAN.md

Re-tag Phase 1: flip the shipped items to ✅ (marquee, group ops, group-move, shortcuts, cheatsheet, drop-import). Add new sub-tasks with status: error taxonomy, toast system, Zod input/form hardening, paste-from-clipboard, read/edit mode, delete confirmation, media object-fit, test backfill. Correct the stale ⬜/🟡 markers and the "Cross-cutting gap" test note.

---

## Workstream 10 — Update all CLAUDE.md

Reflect the new patterns in every CLAUDE.md (6 files). Touch only what changed; do not rewrite working sections.

- **`CLAUDE.md` (root)** — add the error-taxonomy contract (`{error:{code,message,details}}`) as a cross-cutting convention. Reconcile the stated stack versions with reality before editing (root says Next.js 15 / Laravel 12; PLAN.md/user say 16 / 13 — **verify on disk, do not assume**, then align).
- **`client/CLAUDE.md`** — document: toast system (`toastStore` + `Toaster`), canvas read/edit mode (`canvasStore.mode`, gating rule, `H`/`V`), delete-confirmation (`confirmStore` + `ConfirmDialog`), paste-import, media `object-fit:cover` convention. Add new files to the directory map.
- **`client/lib/api/CLAUDE.md`** — document the axios response interceptor + `ApiError` class + `ApiErrorSchema`; the input-`parse()` pre-flight rule; how 422/401/403/404/409/5xx are routed.
- **`server/CLAUDE.md`** — document the normalized error envelope, the `ApiError` helper, and the `withExceptions` render mapping. Reconcile Laravel version note if needed.
- **`server/app/Http/CLAUDE.md`** — controllers now return errors via the envelope/`ApiError`; note the 409 conflict shape (`details.current`).
- **`client/features/notebook/CLAUDE.md`** — only if read/edit mode or confirm affects notebook flows (likely a one-line note that notebook open is read-mode-safe).

**Critical files:** all six paths above.

## Verification (end-to-end)

1. **Backend:** `docker compose up -d postgres redis`, `php artisan migrate`. Hit endpoints with bad/forbidden/missing payloads → confirm every error is `{error:{code,message,details}}` + correct status. `php artisan test` (CRUD + policy + envelope-shape suites green).
2. **Frontend:** `pnpm lint` after each edit (never `tsc --noEmit`). `pnpm test` (Vitest suites above). `pnpm dev`:
   - Trigger a 500 / 403 / network drop → toast appears, glass styling, aria-live, auto-dismiss.
   - Submit bad login → inline field errors from Zod + 422 mapping (no toast).
   - Paste an image and a URL onto the canvas → image card / bookmark card at center.
   - Toggle read mode (`H`): pan/zoom only; cards non-interactive; palette hidden. Edit mode (`V`): full interaction restored.
   - Delete a card and a multi-selection → confirm dialog gates both; Esc/Cancel aborts; focus trapped.
   - Upload an image → fills card frame `object-fit:cover`, no distortion, corners clipped.
3. **Conflict regression:** offline edit → reconnect with stale `base_updated_at` → 409 envelope → `card:conflict` → `SyncStatus` banner (no duplicate toast).
4. **A11y/UI pass:** focus-visible rings, `prefers-reduced-motion`, 44px targets, z-index order (toasts above modals above palette), contrast on new surfaces.