# CLAUDE.md — client/lib/api/

Core API layer. Every server call flows through here.

## Files

| File | Purpose |
|------|---------|
| `client.ts` | axios instance (`apiClient`) pointed at `/api/proxy` |
| `boards.ts` | Raw fetch functions (`getBoard`, `updateCard`, `createCard`…) |
| `hooks.ts` | TanStack Query hooks + `registerMutationDefaults` |
| `persister.ts` | `idbPersister` — IndexedDB persistence for QueryClient |
| `schemas.ts` | Zod schemas: `BoardSchema`, `CardSchema`, `NotebookTabSchema`… |
| `auth.ts` | Auth fetch functions (`login`, `logout`, `getMe`) |

## Error Handling Contract

Every non-2xx response is routed through `ApiErrorSchema.safeParse()` in `client.ts` response interceptor.

```ts
// Shape
{ "error": { "code": "snake_case", "message": "human readable", "details": null | {} } }

// ApiError class (errors.ts)
new ApiError(code, message, status, details?)

// Routing table
Status 422 (ValidationException) → ApiError with details → rejected, NOT toasted; caller handles inline
Status 401 (Unauthenticated) → redirects to /auth/login, toast "Session expired"
Status 403 (Forbidden) → error toast
Status 404 (Not Found) → error toast
Status 409 (Card conflict) → dispatches custom event "card:conflict" (SyncStatus handles), no toast
Status 5xx → error toast
Network error → error toast with "Network error"
```

When mutations throw `ApiError`, hooks detect the status and route accordingly. Login/register pages map 422 `details` (field→string[]) to inline field error messages.

## Proxy Auth Model

**All API calls go through `/api/proxy/[...path]`** (Next.js server route handler).  
The route reads the httpOnly `wn_sid` cookie and attaches a Bearer token before forwarding to Laravel.  
**JS never sees the token.** `apiClient` hits `/api/proxy/…` and the browser auto-sends the cookie.

Do not bypass the proxy. Do not call Laravel (`localhost:8000`) directly from client code.

## Mutation Defaults Pattern

All card mutations are registered via `registerMutationDefaults(qc)` in `hooks.ts`.  
This is required for **offline mutation rehydration** — closures can't be serialized to IDB,  
but `mutationKey` + registered defaults can.

Keys:
- `["cards", "create"]`
- `["cards", "update"]`
- `["cards", "delete"]`

Hook wrappers (`useCreateCard`, `useUpdateCard`, `useDeleteCard`) are thin:
```ts
return useMutation({ mutationKey: ["cards", "update"] });
```
Config (mutationFn, onMutate, onError, onSettled) lives entirely in `registerMutationDefaults`.

**Never inline `mutationFn` in `useMutation` for card ops** — it won't survive reload.

## Offline Mutation Flow

1. `useUpdateCard().mutate(vars)` called while offline
2. react-query pauses mutation (default `networkMode: "online"`)
3. `idbPersister.persistClient` called within 300 ms → paused mutation written to IDB
4. On reload: `restoreClient` reads IDB → `onSuccess` calls `resumePausedMutations()`
5. Mutations replay in order when back online

`shouldDehydrateMutation: () => true` in `providers.tsx` ensures paused mutations are dehydrated.

## Conflict Guard

`updateCard` in `boards.ts` includes `base_updated_at` (current card's `updated_at` from cache) in PATCH body.  
Server returns 409 if stale. `onError` in defaults handles 409: refetch + dispatch `card:conflict` event.

## idbPersister

- Key: `"witsnote-rq"` in IndexedDB
- Write throttle: 300 ms (debounced on burst)
- Debug logs at `console.debug` level — prefix `[idb]`
- Do NOT change the throttle above 500 ms — paused mutations need to reach IDB before hard reload

## File Upload Pipeline

**`uploadAttachment(file, { cardId, onProgress })`** in `boards.ts`:
- XHR to `POST /api/proxy/attachments` with FormData (`file` + `card_id`)
- 30s timeout; progress via `upload.onprogress` event
- Returns `{ id, url, mime, size, original_name }` on 200/201
- Error handlers: `onerror`, `ontimeout`, `onabort` all reject with descriptive messages

**`uploadCardAttachment(opts)`** in `uploadCardAttachment.ts`:
- Shared helper: create card (optimistic) → upload file → update card with attachment
- Orchestrates: `createCardAsync` → `uploadAttachment` → `updateCard` mutation
- State progression: `status: "uploading"` (0%) → progress % → `status: "ready"` (on success) or `status: "error"` (on fail)
- Failure path: rolls back card state to error, client can retry via CardShell overlay

**CardShell media retry:**
- Shows retry button overlay when `status: "error"`
- Clicking retry opens file picker; selecting new file calls `uploadCardAttachment` again
- Progress persists optimistically in local store during upload
