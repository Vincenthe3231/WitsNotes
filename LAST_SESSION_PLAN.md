# Fix two BlockNote editor bugs (null-text crash + Alert cursor escape)

## Context

The notebook/canvas editor uses BlockNote (`useCreateBlockNote`) with two custom
schema additions: a custom **Alert** block (`createReactBlockSpec`, `content: "inline"`)
and a **notebookMention** inline content (`createReactInlineContentSpec`, `content: "none"`).
Two related defects surface around these custom pieces:

1. **Cross-ref origin crash.** Clicking a `notebookMention`, landing on the destination
   page, then refreshing crashes the origin notebook page with
   `TypeError: can't access property 'split', e.text is null`. The crash happens during
   hydration: stored blocks are passed as `initialContent` at
   `client/features/notebook/NotebookEditor.tsx:132`, and BlockNote's `blockToNode`
   (`ckToNode.ts`) calls `text.split(...)` on an inline text node whose `text` is `null`.
   The existing `EditorBoundary` catches it but recovers by mounting an **empty** doc —
   so the page survives but the user's content disappears until they edit.

2. **Alert custom block cursor escape.** On a new line, inserting an Alert block and
   typing makes the caret immediately jump to the next line (text escapes the block).

## Root causes

- **Bug 1:** `migrateInlineContent` (`NotebookEditor.tsx:73-86`) filters inline items by
  `type` and patches `notebookMention.props`, but it never validates the `text` field of
  `text` nodes, nor does it recurse into `link` nodes (which hold a nested
  `content: [{ type:"text", text, styles }]`). A persisted text node with `text: null`
  (or a link with a null-text child) flows untouched into `initialContent` and crashes
  `blockToNode`'s `.split()`.

- **Bug 2:** In `client/features/editor/AlertBlock.tsx:48` the icon is rendered as an
  **inline** `<span contentEditable={false}>` that is a sibling of the `contentRef`
  content **inside the block's editable inline region**. ProseMirror maps caret offsets
  by walking inline DOM; an inline `contentEditable=false` node gets miscounted, so input
  maps the caret past the block boundary → caret jumps to the next line. BlockNote's
  official Alert example isolates the icon in a **block** `<div contentEditable={false}>`
  (a widget PM ignores for inline counting) and styles the content hole with
  `flex-grow: 1`. Our markup uses a `<span>` + `flex: 1` (which is `flex: 1 1 0%`),
  diverging from the known-good structure.

Both edits live entirely in `client/` — no server change.

## Changes

### 1. Harden inline-content sanitization — `client/features/notebook/NotebookEditor.tsx`

Rewrite `migrateInlineContent` (lines 73-86) so every inline item is normalized, not
just filtered. Add a small helper and apply it recursively:

- For `type === "text"` (or missing `type`, which BlockNote treats as text):
  guarantee `text` is a string via `typeof text === "string" ? text : ""`, and ensure
  `styles` is an object (`styles ?? {}`). **Drop** the node if the coerced text is empty
  (ProseMirror cannot hold an empty text node — BlockNote represents empty inline content
  as `[]`, so this matches its own normalization and avoids trading the null crash for an
  "empty text node" crash).
- For `type === "link"`: recurse the same normalization over `link.content`; drop the
  link if its content normalizes to empty.
- For `type === "notebookMention"`: keep the existing `boardId` back-fill.
- Anything else: filter out (unknown type), as today.

This is the single authoritative fix point because `NotebookEditorInner` already routes
`tab.blocks` through `sanitizeBlocks` → `migrateInlineContent` before
`useCreateBlockNote` (`NotebookEditor.tsx:130-132`). Apply the same hardened
`migrateInlineContent` in `client/features/editor/NotionEditor.tsx` if it carries its own
copy of the sanitizer (the card editor shares the Alert/mention schema); reuse one shared
helper rather than duplicating — extract `migrateInlineContent`/`sanitizeBlocks` into a
small shared module (e.g. `client/lib/notebook/sanitizeBlocks.ts`) and import from both
editors.

Keep `EditorBoundary` as-is — it stays a defensive backstop, but the sanitizer now
prevents the crash so content is no longer lost.

### 2. Fix Alert block markup — `client/features/editor/AlertBlock.tsx`

Align the `render` output (lines 36-51) with BlockNote's working Alert example:

- Change the icon from an inline `<span contentEditable={false}>` to a **block**
  `<div contentEditable={false}>` wrapper, so PM treats it as an ignored widget and does
  not count it in inline caret mapping. Keep `flexShrink: 0` and `user-select: none`.
- Change the content hole from `style={{ flex: 1 }}` to `style={{ flexGrow: 1, minWidth: 0 }}`
  (matches official `.inline-content { flex-grow: 1 }`; `minWidth: 0` lets it shrink
  inside the flex row and gives the caret a stable target). Leave `ref={contentRef}`.
- Keep the outer flex container and `level` → icon/color logic unchanged.

Leave the slash-menu insert path (`NotebookEditor.tsx:176-178`,
`requestAnimationFrame(() => editor.setTextCursorPosition(b, "start"))`) in place; it is
the correct re-focus pattern for an async React NodeView. Only revisit it if the markup
fix alone does not seat the caret on insert (see Fallback).

### Fallback (only if Bug 2 persists after markup fix)

Per BlockNote issue #1802, switching the Alert from `createReactBlockSpec` to
`createStronglyTypedTiptapNode` + `createBlockSpecFromStronglyTypedTiptapNode` resolves
residual cursor/placeholder issues. This is a larger rewrite of `AlertBlock.tsx` — hold
it in reserve; do not do it preemptively.

## Verification

Client only — run from `client/`. No server/migrations involved.

1. `pnpm lint` — must pass (project rule: never `tsc --noEmit`).
2. `pnpm dev`, open a board notebook.
3. **Bug 1 (regression repro):**
   - Create a page A, add an Alert block + a few lines, insert an `@`-mention to page B.
   - Click the mention → lands on page B. Refresh the browser on B, then navigate back
     to A and refresh A.
   - Expect: A renders with all original content intact, **no** `e.text is null` in
     console, **no** `[NotebookEditor] initialContent failed` boundary log.
   - Hard case: in devtools/tinker, seed a tab's `blocks` with an inline text node whose
     `text` is `null` (and a `link` with a null-text child); reload — editor must render
     them as empty/normalized rather than crash.
4. **Bug 2:** On an empty line, open slash menu → insert each Alert level. Type a
   sentence including spaces. Expect: caret stays inside the Alert block, text wraps
   normally, no jump to the next line. Press Enter inside the Alert to confirm
   `nestingEnter` behavior is unaffected.
5. Confirm existing notebooks (mentions, links, nested toggles) still load and edit.

## Critical files

- `client/features/notebook/NotebookEditor.tsx` — `migrateInlineContent` / `sanitizeBlocks` (Bug 1)
- `client/features/editor/NotionEditor.tsx` — shares schema; apply same sanitizer (Bug 1)
- `client/features/editor/AlertBlock.tsx` — `Alert` render markup (Bug 2)
- (new) `client/lib/notebook/sanitizeBlocks.ts` — shared sanitizer extracted from the two editors

## Sources:

- [BlockNote #1802 — createReactBlockSpec cursor](https://github.com/TypeCellOS/BlockNote/issues/1802)
- [BlockNote #1551 — newline in custom block](https://github.com/TypeCellOS/BlockNote/issues/1551)
- [Official Alert Block example](https://www.blocknotejs.org/examples/custom-schema/alert-block)