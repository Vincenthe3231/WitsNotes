# CLAUDE.md — server/

Laravel 12, PHP 8.3. Database: **PostgreSQL** (not SQLite).

## Prerequisites

```bash
docker compose up -d postgres redis   # must be running before artisan commands
```

## Commands

```bash
# File uploads require PHP ini overrides — default upload_max_filesize=2M rejects typical screenshots
php -d upload_max_filesize=50M -d post_max_size=60M artisan serve   # recommended
php artisan serve              # dev server — localhost:8000 (2MB upload limit)
php artisan migrate            # run pending migrations
php artisan migrate:fresh      # drop all + re-migrate (dev only)
php artisan migrate:rollback   # undo last batch
php artisan tinker             # REPL

composer install               # install PHP deps
composer require <pkg>         # add dependency
```

## Testing (PHPUnit via Pest)

```bash
php artisan test                              # all tests
php artisan test --filter=TestName           # single test or method
php artisan test tests/Feature/Foo.php       # single file
php artisan test tests/Feature/             # entire Feature suite
```

Tests use PostgreSQL test DB (`pgsql` in `phpunit.xml`) — separate from dev; `docker compose up -d postgres` required.

## Directory Map

```
app/
  Http/
    Controllers/    Route handlers — see app/Http/CLAUDE.md
    Middleware/     Auth, CORS, session middleware
  Models/           Eloquent models (User, Board, Card…)
  Policies/         Authorization policies (BoardPolicy, CardPolicy)
  Providers/        AppServiceProvider, AuthServiceProvider

database/
  migrations/       Schema migrations — one file per change, never modify existing
  factories/        Model factories for tests
  seeders/          Database seeders

routes/
  web.php           Web routes (session-based, Sanctum cookie auth)
  api.php           API routes (prefix /api, stateless + Sanctum token)

tests/
  Feature/          HTTP/integration tests — prefer these over Unit
  Unit/             Pure unit tests (rare)
```

## Key Conventions

### Routing
- `routes/web.php` — web middleware group, session/cookie auth (Sanctum).
- `routes/api.php` — `api` middleware group, prefix `/api`. All client-facing endpoints here.
- Never add stateful logic to API routes.

### Controllers
See `app/Http/CLAUDE.md` for full controller conventions.

- Thin controllers — business logic in models or dedicated service classes if complex.
- Return `response()->json($data, $status)` — never raw arrays.
- Validate with `$request->validate([...])` at the top of each method.
- Policy authorization via `$this->authorize('action', $model)`.

### Models
- Mass-assignable fields listed in `$fillable`.
- Always define `$casts` for JSON columns (`content`, `style` are `array`).
- Relationships: `Board hasMany Card`, `Card belongsTo Board`.

### Migrations
- One migration per logical change — never edit existing migration files.
- Use `$table->timestamps()` on every new table (`created_at`, `updated_at`).
- `updated_at` is the conflict guard for offline sync — do not remove it from cards.

### Offline Conflict Guard (cards)
`CardController::update` checks `base_updated_at` (sent by client) against `$card->updated_at`.  
Stale → returns `response()->json($freshCard, 409)`.  
Last-write-wins when `base_updated_at` is absent (legacy / non-offline clients).  
See `app/Http/CLAUDE.md` for implementation detail.
