# CLAUDE.md — server/app/Http/

Laravel HTTP layer: controllers, middleware.

## Controllers

Located in `Controllers/`. Each controller is thin — validate, authorize, delegate to model/query, return JSON.

### Conventions

```php
// 1. Authorize first
$this->authorize('update', $card);

// 2. Validate
$data = $request->validate([
    'title' => 'sometimes|string|max:255',
    'content' => 'sometimes|array',
]);

// 3. Act
$card->update($data);

// 4. Return JSON — never raw arrays
return response()->json($card, 200);
```

Always return `response()->json(...)`. Never `return $model` directly (bypasses status code control).

### CardController::update — Offline Conflict Guard

When client sends `base_updated_at`, server checks for stale writes:

```php
if ($request->has('base_updated_at')) {
    $base = $request->input('base_updated_at');
    if ($base !== $card->updated_at->toISOString()) {
        return response()->json($card->fresh(), 409);
    }
}
// Apply update...
```

- 409 response body is the **fresh card** (client uses it to reconcile).
- When `base_updated_at` is absent: last-write-wins (backward compat with non-offline clients).
- Do not change this logic without updating `onError` in `client/lib/api/hooks.ts` `registerMutationDefaults`.

## Middleware

- `Authenticate` — redirects unauthenticated web requests, returns 401 JSON for API.
- `EnsureFrontendRequestsAreStateful` — Sanctum; handles CORS + cookie for SPA.

## Key Files

| File | Purpose |
|------|---------|
| `Controllers/BoardController.php` | CRUD for boards |
| `Controllers/CardController.php` | CRUD for cards + conflict guard |
| `Controllers/AuthController.php` | login, logout, me |
| `Controllers/AttachmentController.php` | File upload → R2; store/show/destroy |
| `Middleware/` | Auth + Sanctum SPA middleware |

### AttachmentController::store

Accepts multipart `POST /api/attachments` with `file` + `card_id`.  
Stores file to Cloudflare R2 (configured in `config/attachments.php`).  
Returns `{ id, url, mime, size, original_name }` — client uses to populate card's attachment_id + content.

```php
$path = $request->file('file')->store('attachments', 'r2');
$att = Attachment::create([
    'card_id' => $request->input('card_id'),
    'disk' => 'r2',
    'path' => $path,
    'mime' => $file->getMimeType(),
    'size' => $file->getSize(),
    'original_name' => $file->getClientOriginalName(),
]);
return response()->json($att);
```
