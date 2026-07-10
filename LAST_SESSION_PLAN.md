# Fix collab board: card create, projection persistence, attachment upload

## Context

Previous session wired card-create on collab boards to the Y.Doc (`ydocInsertCard`)
instead of REST. That broke all card functionality on shared boards. Symptoms:

1. **Add to-do → error.**
2. **Notebook created on creator's side, peer never sees it.**
3. **Image/file upload → `422 validation_failed: "The selected card id is invalid."`**
4. **Adding any card appears to duplicate another.**

Goal: make every card type (notebook, todo, bookmark, links, image/file upload)
create, render, persist, and sync correctly on collab boards.

## Root causes (verified via CodeGraph across client + sidecar + DB)

### RC1 — `created_by` is NOT NULL, but the Y.Doc path supplies null → projection 500
- DB column: `cards.created_by` = `foreignId(...)->constrained('users')` → **NOT NULL**
  ([2026_06_19_000002_create_cards_table.php:15](server/database/migrations/2026_06_19_000002_create_cards_table.php)).
- My collab create builds the card with `created_by: null`; `ydocInsertCard` skips null,
  so the Y.Map has no `created_by` ([CardPalette.tsx:62-96](client/features/cards/CardPalette.tsx),
  [ydocMutations.ts:23](client/lib/collab/ydocMutations.ts)).
- Sidecar projection `storeYDoc` → `PUT /ydoc` → `CollabInternalController::store` runs
  `Card::updateOrCreate(['id'=>id], merge(cardData, board_id, deleted_at:null))` inside a
  DB transaction ([CollabInternalController.php:71-95](server/app/Http/Controllers/CollabInternalController.php)).
  Inserting a row with `created_by = null` violates NOT NULL → the whole transaction throws.
- Effect: Y.Doc **blob is never persisted** (saved in the same transaction), cards never
  projected. On peer load (no blob) the sidecar seeds from DB cards — which lack the new card
  → **peer never sees it (RC for symptom 2)**.

### RC2 — `created_by` type mismatch makes projection fail even for valid cards
- Projection validation: `'cards.*.created_by' => ['nullable', 'string']`
  ([CollabInternalController.php:68](server/app/Http/Controllers/CollabInternalController.php)).
- Real `created_by` is an **integer** (`foreignId`, REST sets `$request->user()->id`
  [CardController.php:41](server/app/Http/Controllers/CardController.php)). When the sidecar
  seeds a board that already has cards, `extractCards` carries the integer
  ([collab/src/persistence.ts:70](collab/src/persistence.ts)) and the `string` rule **rejects it → 422**.
- This means collab persistence has effectively **never worked for any board that has cards** —
  consistent with "all cards broken in collab."

### RC3 — attachment upload references a card that isn't in the DB
- Collab card lives only in the Y.Doc (random UUID), never in `cards`.
- `uploadAttachment` POSTs `card_id`; `AttachmentController::store` validates
  `'card_id' => 'required|uuid|exists:cards,id'` ([AttachmentController.php:29](server/app/Http/Controllers/AttachmentController.php))
  → **422 "selected card id is invalid" (exact stack-trace match, symptom 3)**.

### RC4 — apparent duplicates
- Downstream of RC1/RC2: server blob never saves, so the creator's local `IndexedDbPersistence`
  doc (`witsnote-collab-${boardId}`, [useBoardDoc.ts:49](client/lib/collab/useBoardDoc.ts))
  diverges from the DB-reseeded doc on each reload, surfacing stale/duplicate cards.
  Fixing RC1/RC2 stops the divergence; stale local state is cleared in verification.

## Plan

Make collab card-create **REST-first, then mirror into the Y.Doc** (server owns id +
`created_by`), and make the projection tolerant of `created_by` typing. Reuses existing
`createCardAsync`, `ydocInsertCard`, `uploadCardAttachment` — no new client mutations.

### Fix A — client: REST-create then Y.Doc-insert on collab (all palette types)
[client/features/cards/CardPalette.tsx](client/features/cards/CardPalette.tsx)
- `spawnCard`: when `isCollab`, `const card = await createCardAsync({ boardId, type, x, y, w, h, z, rotation })`
  then `ydocInsertCard(ydoc, card)`. Drop the `crypto.randomUUID()` / `created_by: null` build.
  Keep the plain `createCardAsync` for non-collab. (Make `spawnCard` async.)
- `handleFileChosen`: use the **same REST `createCardAsync`** for both collab and non-collab
  (real DB row first), then `if (isCollab) ydocInsertCard(ydoc, card)` before `uploadCardAttachment`.
  Real row → attachment `exists:cards,id` passes (fixes RC3); card in Y.Doc → peer sync + projection-safe.
- Result: one card in `ydocCards`; collab render path ignores optimistic `localCards`
  ([CanvasLayer.tsx:55-62](client/features/canvas/CanvasLayer.tsx)) → no duplicate.

### Fix B — server: projection must not corrupt `created_by`
[server/app/Http/Controllers/CollabInternalController.php](server/app/Http/Controllers/CollabInternalController.php)
- Relax validation: `'cards.*.created_by' => ['nullable']` (drop `string`) so integer ids pass (RC2).
- In the upsert loop, **never write a null/empty `created_by` onto a row**: build `$attrs`, then
  `if (empty($attrs['created_by'])) unset($attrs['created_by']);` before `updateOrCreate`.
  REST already created the row with a valid `created_by`; `updateOrCreate` matches on `id` and
  leaves it intact (RC1).

### Fix C — keep canvas-store reset (already in place)
[client/features/canvas/InfiniteCanvas.tsx:32-38](client/features/canvas/InfiniteCanvas.tsx) — leave as-is
(prevents cross-board `localCards` leak; unrelated to collab but correct).

### Out of scope
- Fine-grained notebook text into Y.Doc (full-page notebook route is outside `BoardDocContext`).
- `created_by` type unification across the stack (string vs int) — Fix B sidesteps it safely.

## Files to touch
- `client/features/cards/CardPalette.tsx` — REST-first create + Y.Doc mirror (Fix A).
- `server/app/Http/Controllers/CollabInternalController.php` — projection `created_by` guard (Fix B).

## Verification
1. **Reset stale collab state** (RC4): `php artisan tinker` → delete the board's `board_documents`
   row; in each browser clear IndexedDB `witsnote-collab-*`. Ensure `collab` sidecar + Laravel + PG running.
2. **Collab create** (2 browsers, both members): add notebook, todo, bookmark, links — each appears
   immediately on the creator's canvas **and** on the peer within the sync window. No duplicates.
3. **Collab upload**: add image and file. Card appears, upload completes (no 422), peer sees it.
4. **Persistence**: reload both browsers → all cards persist (projection wrote them; check no
   `storeYDoc ... failed` in sidecar logs).
5. **Non-collab unchanged**: on a personal board, every type still creates via REST as before.
6. `pnpm lint` clean; `php artisan test` green.