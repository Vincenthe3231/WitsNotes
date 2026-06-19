# Feature: Notebook Card + Document Page

## Overview

The existing inline "note" card is promoted to a **Notebook Card** — a resizable canvas element that acts as an entry point to a full-screen document editor (Lark/Feishu-style). Each notebook supports unlimited named tabs with BlockNote rich-text content, a 2s debounce auto-save with visual indicator, and optional per-notebook password encryption (client-side only, libsodium). Double-clicking the canvas card navigates to `/board/[id]/notebook/[cardId]`; the back button returns to the canvas.

---

## Functional Requirements

### Canvas Card

**FR-NB-001: Card type rename**
The system shall rename all cards with `type = "note"` to `type = "notebook"` via a data migration and update all client-side references accordingly.

**FR-NB-002: Card preview — title**
While a notebook card exists on the canvas, the system shall display the title of the first tab (or "Untitled" if empty) in the card header.

**FR-NB-003: Card preview — tab count badge**
While a notebook has more than one tab, the system shall display a badge showing the total tab count in the card header.

**FR-NB-004: Card preview — lock icon**
Where notebook encryption is enabled, the system shall display a lock icon on the canvas card.

**FR-NB-005: Open Document Page**
When the user double-clicks a notebook card on the canvas, the system shall navigate to `/board/[boardId]/notebook/[cardId]`.

**FR-NB-006: Open button in header**
The system shall display an "open" icon button in the notebook card header that, when clicked, navigates to the Document Page (same as double-click).

**FR-NB-007: Locked card interaction**
While a notebook card is encrypted, when the user double-clicks or clicks the open button, the system shall show a password modal before navigating to the Document Page.

---

### Document Page

**FR-NB-010: Route**
The system shall serve the Document Page at `/board/[boardId]/notebook/[cardId]` as a full-screen Next.js route.

**FR-NB-011: Back navigation**
When the user clicks the back button on the Document Page, the system shall navigate to `/board/[boardId]`.

**FR-NB-012: Tab bar**
The system shall render a horizontal tab bar at the top of the Document Page displaying all tab titles.

**FR-NB-013: Active tab editor**
When the user selects a tab, the system shall display the BlockNote editor for that tab's content.

**FR-NB-014: Add tab**
When the user clicks the "+" button in the tab bar, the system shall append a new tab with a default title ("Untitled") and an empty BlockNote document.

**FR-NB-015: Rename tab**
When the user double-clicks a tab title, the system shall make it inline-editable; when the user blurs or presses Enter, the system shall save the new title.

**FR-NB-016: Delete tab**
While a notebook has more than one tab, when the user clicks the tab's delete (×) button, the system shall remove the tab and activate the adjacent tab.

**FR-NB-017: Reorder tabs**
When the user drags a tab to a new position in the tab bar, the system shall reorder the tabs accordingly.

**FR-NB-018: Rich-text editing**
The system shall provide a BlockNote editor per tab including: slash-menu block types, FormattingToolbar bubble menu (bold, italic, underline, strike, highlight, text color, link), and the custom Alert/callout block.

---

### Auto-save

**FR-NB-020: Debounce save**
While the user is editing a tab, the system shall debounce saving by 2 seconds after the last content change.

**FR-NB-021: Save status indicator**
While a save is pending or in-flight, the system shall display "Saving…"; when the save succeeds, the system shall display "Saved" for 2 seconds then hide the indicator.

**FR-NB-022: Content serialisation**
When saving, the system shall store `{ tabs: [{ id, title, blocks: Block[] }] }` in `cards.content` and concatenated plaintext from all tabs in `cards.content_text` (for search indexing).

---

### Encryption

**FR-NB-030: Enable encryption — context menu**
When the user right-clicks a notebook card on the canvas and selects "Lock notebook", the system shall show a "Set password" modal.

**FR-NB-031: Enable encryption — editor**
When the user clicks the lock icon in the Document Page toolbar and selects "Lock notebook", the system shall show the same "Set password" modal.

**FR-NB-032: Key derivation**
When the user sets a password, the system shall derive an encryption key using Argon2id (libsodium `crypto_pwhash`) with a newly generated random salt stored in `cards.style.vault_salt`.

**FR-NB-033: Content encryption**
When the user sets a password, the system shall encrypt all tab content using `crypto_secretbox` (XSalsa20-Poly1305) and store the ciphertext blob in `cards.content`; `cards.content_text` shall be cleared.

**FR-NB-034: Verifier storage**
The system shall store a small encrypted verifier in `cards.style.vault_verifier` (encrypt a known constant with the derived key) to enable fast password verification without decrypting all content.

**FR-NB-035: Unlock flow**
While a notebook card is encrypted, when the user attempts to open it, the system shall display a password modal; on correct password entry, the system shall decrypt the content in-memory and open the Document Page.

**FR-NB-036: Failed attempts lockout**
While a notebook is in the password modal, when the user submits an incorrect password for the 5th consecutive time, the system shall disable the input and show a 60-second cooldown timer before allowing further attempts.

**FR-NB-037: Server opacity**
The system shall never send the plaintext password or derived key to the server; the server shall store only the ciphertext blob and salt.

**FR-NB-038: Disable encryption**
While a notebook is encrypted, when the user authenticates and navigates to the Document Page, the system shall offer a "Remove lock" option in the editor toolbar that, when confirmed with the current password, decrypts all content and removes vault metadata.

---

## Non-Functional Requirements

### Performance
- Document Page initial load (JS parse + editor mount): < 1.5s on desktop
- Auto-save PATCH round-trip: < 300ms p95 (content < 500KB per notebook)
- Argon2id key derivation: acceptable UX delay of 0.5–2s (intentional, security trade-off)
- Tab switch: < 50ms (purely client-side, no network)

### Security
- Encryption key exists only in `sessionStorage` (cleared on tab close) or JS memory; never sent to server
- Salt stored in `cards.style` (server-readable) — non-secret
- Verifier is a libsodium `crypto_secretbox` of a known 32-byte constant — allows password check without exposing content
- Input: URL-validate passwords (no length limit, trim whitespace)
- Context menu "Lock notebook" requires user to be the card owner (Laravel policy)

### Scalability
- Notebook content stored as JSON in `cards.content` (Postgres JSONB); no separate table needed for tabs
- `content_text` is concatenated plaintext of all tabs for search — regenerated on every save

---

## Acceptance Criteria

### AC-NB-001: Preview on canvas
Given a notebook card with two tabs ("Meeting Notes", "Action Items") and no encryption,
When the board renders,
Then the card header shows "Meeting Notes", a "2" badge, and no lock icon.

### AC-NB-002: Open Document Page
Given a notebook card on the canvas,
When the user double-clicks the card,
Then the browser navigates to `/board/{boardId}/notebook/{cardId}` showing the Document Page.

### AC-NB-003: Tab management
Given the Document Page is open with one tab,
When the user clicks "+", types a name, and presses Enter on a new tab,
Then a second tab appears in the tab bar and an empty editor is shown.

### AC-NB-004: Auto-save indicator
Given the user is editing in the Document Page,
When the user stops typing,
Then "Saving…" appears within 50ms; "Saved" appears after the PATCH succeeds; the indicator fades after 2s.

### AC-NB-005: Tab drag reorder
Given the Document Page has three tabs in order [A, B, C],
When the user drags tab C to position 1,
Then the tab bar order becomes [C, A, B] and the change persists after page reload.

### AC-NB-006: Encryption set
Given an unencrypted notebook card,
When the user right-clicks → "Lock notebook" → sets password "hunter2",
Then the card displays a lock icon and `cards.style.encrypted = true`; `cards.content_text` is empty.

### AC-NB-007: Correct unlock
Given a locked notebook card,
When the user double-clicks → enters correct password,
Then the Document Page opens and all tab content is visible.

### AC-NB-008: Wrong password lockout
Given a locked notebook card,
When the user submits an incorrect password 5 times consecutively,
Then the input is disabled and a 60-second countdown is shown; after 60s, input re-enables.

### AC-NB-009: Server opacity
Given a locked notebook,
When inspecting the PATCH request payload,
Then `content` is a ciphertext blob (not readable text) and no password or key field is present.

---

## Error Handling

| Error Condition | Behavior |
|-----------------|----------|
| PATCH save fails (network) | Retry up to 3× with exponential backoff; show "Save failed — retrying…"; after 3 failures show "Save failed" with manual retry button |
| Document Page loaded for non-existent card | Redirect to `/board/[boardId]` with toast "Notebook not found" |
| Decryption fails (corrupt ciphertext) | Show error modal "Decryption failed — the notebook data may be corrupted" with option to contact support |
| Tab delete when only 1 tab | Delete button hidden/disabled; no error needed |
| libsodium not available (SSR) | Editor is dynamic-imported (`ssr: false`); crypto operations only run client-side |

---

## Implementation TODO

### Backend (server/)

- [ ] Migration: rename `type = 'note'` → `'notebook'` in existing rows
- [ ] Migration: add `title VARCHAR(255) NULL` to `cards` table
- [ ] `Card::$fillable`: add `title`; update `content` handling to accept new tab schema
- [ ] `CardController::update`: accept `title`, `content` (tabs JSON), `content_text`, `style`
- [ ] `CardController::search`: search `title` + `content_text` via `ILIKE` / `pg_trgm`
- [ ] `UnfurlController`: new controller for `GET /api/unfurl?url=` (OG metadata, separate feature)
- [ ] Routes: `GET /api/cards/search`, `GET /api/unfurl`

### Frontend — Canvas Card (client/)

- [ ] Rename `MemoCard.tsx` → `NotebookCard.tsx`; update all imports
- [ ] Update `CardShell.tsx`: render first-tab title (from `card.content.tabs[0].title`) in header
- [ ] `CardShell.tsx`: show tab count badge if `tabs.length > 1`
- [ ] `CardShell.tsx`: show lock icon if `card.style.encrypted`
- [ ] `CardShell.tsx`: add "open" button (`ExternalLink` icon) in header → navigate to Document Page
- [ ] `CardShell.tsx`: double-click card body → navigate (or show password modal if encrypted)
- [ ] Context menu: add "Lock notebook" / "Remove lock" options

### Frontend — Document Page (client/)

- [ ] New route: `client/app/(canvas)/board/[id]/notebook/[cardId]/page.tsx`
- [ ] `NotebookPage` component: fetch card data, decrypt if needed, render tab bar + editor
- [ ] `TabBar.tsx` component: horizontal tabs, add (+), rename (dblclick), delete (×), drag-reorder (`@dnd-kit/core` or `react-beautiful-dnd` — check if already installed, else use pointer-based manual)
- [ ] `NotebookEditor.tsx`: BlockNote editor per tab with FormattingToolbar + CompactSlashMenu + Alert block
- [ ] Auto-save hook: `useNotebookSave(cardId, boardId)` — debounce 2s, "Saving…" / "Saved" indicator
- [ ] Save serialises: `{ tabs: [{ id, title, blocks }] }` → `content`; concat plaintext → `content_text`

### Frontend — Encryption (client/)

- [ ] Install `libsodium-wrappers` if not present: `pnpm add libsodium-wrappers @types/libsodium-wrappers`
- [ ] `client/lib/crypto/notebook.ts`: `deriveKey(password, salt)`, `encryptContent(key, data)`, `decryptContent(key, blob)`, `makeVerifier(key)`, `checkVerifier(key, verifier)`
- [ ] `PasswordModal.tsx`: enter-password modal with attempt counter + cooldown timer (60s after 5 fails)
- [ ] `SetPasswordModal.tsx`: set + confirm new password; strength indicator optional
- [ ] Key stored in `sessionStorage` keyed by `cardId` (survives tab navigation, cleared on browser close)
- [ ] `NotebookPage`: on load, if `style.encrypted`, check `sessionStorage` for cached key → skip modal if found

### Frontend — Schema / API (client/)

- [ ] `client/lib/api/schemas.ts`: update `CardSchema` — add `title?: string`; type `content` to accept `{ tabs: NotebookTab[] } | { blocks: Block[] } | Record<string,unknown>`
- [ ] `client/lib/api/schemas.ts`: define `NotebookTab = { id: string, title: string, blocks: Block[] }`
- [ ] `client/lib/api/hooks.ts`: `useUpdateCard` already exists — confirm it accepts new payload shape
- [ ] `client/lib/api/hooks.ts`: add `useSearchCards(query)` for CommandPalette search tab

---

## Out of Scope

- Real-time collaboration (Yjs) on notebook content — Phase 3
- OCR of handwritten content in notebooks — Phase 4
- PDF/Markdown export of notebook — Phase 5
- Sharing a single notebook tab publicly
- Version history / undo across sessions (only in-editor BlockNote undo)

---

## Open Questions

- [ ] Drag-reorder library: check if `@dnd-kit/core` is already installed in `client/package.json`; if not, use pointer-events based manual drag for the tab bar to avoid adding a dep.
- [ ] Should the notebook card inline editor be removed entirely, or kept for a "quick edit" mode on small cards? (Decision: remove — the card is now preview-only, editor lives in Document Page.)
