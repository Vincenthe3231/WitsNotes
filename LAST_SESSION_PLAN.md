# Fix: ghost card + table-edit 409 conflict

## Bug 1 — ghost duplicate card / drag 404

Root cause: `client/features/canvas/CanvasLayer.tsx:53-58` seeds `localCards`
additively from server `cards` but never prunes. `useCreateCard`'s `onMutate`
(`client/lib/api/hooks.ts:99-121`) injects a `temp-${Date.now()}` placeholder
straight into react-query's board cache; CanvasLayer's seed effect copies it
into `localCards` too. Once the real create settles and `onSettled` invalidates
+ refetches (temp id gone from server data), `localCards` still holds the
temp entry forever (zustand store, not reconciled) — ghost renders, and
dragging/updating it PATCHes `/api/cards/temp-...` → 404.

**Fix**: in the same seed `useEffect` in `CanvasLayer.tsx`, after seeding
unseen cards, also drop any `localCards` entry whose id is no longer present
in the fresh `cards` list from the server (skip while it's the one currently
being dragged, to avoid yanking a card mid-drag).

## Bug 2 — table edit 409 conflict

Root cause: `client/lib/api/hooks.ts:141-153`, the `cards/update` mutation's
`onMutate` patches the cached card's fields but never bumps its `updated_at`.
`mutationFn` (line 137-139) reads `base_updated_at` from the cache at call
time. Editing multiple table cells fast (blur-per-cell) fires several updates
before the first one's `onSettled` invalidate/refetch lands — each later call
reads the same stale `updated_at`, while the server row already moved after
the first PATCH succeeded → 409 on every following cell edit.

**Fix**: in that same `onMutate`, when patching the cached card, also set
`updated_at: new Date().toISOString()` so back-to-back edits chain off the
locally-advanced timestamp instead of the stale one.

## Verification

- `pnpm lint` clean.
- Manual: create a card on canvas, confirm no duplicate renders and no
  temp-id request in network tab; drag the new card immediately after
  creation, confirm no 404.
- Manual: edit 3+ cells in a table card rapidly, confirm no 409 in network
  tab, confirm all edits persist after reload.
- `pnpm vitest run` still green (no logic change to pure modules, just
  store/mutation glue).