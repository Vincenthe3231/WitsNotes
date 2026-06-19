# BlockNote API Reference — WitsNote

BlockNote version: **0.51.4** (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`)

---

## Table of Contents

1. [Editor setup](#editor-setup)
2. [Custom block specs](#custom-block-specs)
3. [Custom inline content specs](#custom-inline-content-specs)
4. [Slash menu customisation](#slash-menu-customisation)
5. [Extensions — custom keyboard shortcuts](#extensions--custom-keyboard-shortcuts)
6. [Autosave with flush-on-navigate](#autosave-with-flush-on-navigate)
7. [SSR / dynamic import](#ssr--dynamic-import)
8. [Toggle heading state](#toggle-heading-state)
9. [Known gotchas](#known-gotchas)

---

## Editor setup

```tsx
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, alert: Alert },
  inlineContentSpecs: { ...defaultInlineContentSpecs, notebookMention: NotebookMention },
});

const editor = useCreateBlockNote({
  schema,
  initialContent,   // Block[] | undefined — undefined → empty doc (not [])
  uploadFile,       // async (file: File) => string
  extensions: [nestingEnter],
});
```

**`initialContent` must be `undefined` or a non-empty array.**  
Passing `[]` causes ProseMirror to reject the document (`blockGroup` cannot be empty).

```ts
const sanitized = rawBlocks ? sanitizeBlocks(rawBlocks) : [];
const initialContent = sanitized.length ? sanitized : undefined;
```

---

## Custom block specs

Defined with `createReactBlockSpec` from `@blocknote/react`.  
WitsNote custom blocks:

| Key | File | Props |
|-----|------|-------|
| `alert` | `client/features/editor/AlertBlock.tsx` | `level: "info" \| "warning" \| "danger" \| "success"` |

Registration:

```ts
BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs, alert: Alert } })
```

### Block sanitization

`sanitizeBlocks` in `NotebookEditor.tsx` filters unknown block types before passing to `initialContent`.  
Add new custom block keys to `KNOWN_BLOCK_TYPES`:

```ts
const KNOWN_BLOCK_TYPES = new Set<string>([
  ...Object.keys(defaultBlockSpecs),
  "alert",
  // add new custom block types here
]);
```

---

## Custom inline content specs

Defined with `createReactInlineContentSpec` from `@blocknote/react`.

### `NotebookMention`

File: `client/features/editor/NotebookMention.tsx`

```ts
propSchema: {
  boardId: { default: "" },
  cardId:  { default: "" },
  tabId:   { default: "" },
  label:   { default: "" },
}
```

**The `render` function is a React component** — hooks (`useRouter`, `usePathname`) are allowed.

Insert programmatically:

```ts
editor.insertInlineContent([
  { type: "notebookMention" as any, props: { boardId, cardId, tabId, label } },
  " ",
]);
```

**Navigation** uses `router.push` (SPA, no reload) so the autosave flush on unmount fires correctly.  
Legacy mentions with `boardId: ""` fall back to the current URL's board segment:

```ts
const boardId = props.boardId || pathname?.split("/")[2] || "";
```

### Legacy migration

`migrateInlineContent` in `NotebookEditor.tsx` backfills `boardId: ""` into old mentions that lack the field. Runs during `sanitizeBlocks`.

---

## Slash menu customisation

**Use `insertOrUpdateBlockForSlashMenu` from `@blocknote/core`** — it converts the current block in place (removes the `/` trigger text and replaces the block type). **Never use `editor.insertBlocks(..., "after")`** for slash-menu items; that appends a sibling and leaves the trigger block empty.

```ts
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core";

// Heading item
onItemClick: () => {
  const b = insertOrUpdateBlockForSlashMenu(editor, {
    type: "heading",
    props: { level, isToggleable: true },
  });
  // keep toggle expanded after creation
  queueMicrotask(() => window.localStorage.setItem(`toggle-${b.id}`, "true"));
},

// Alert item
onItemClick: () => {
  insertOrUpdateBlockForSlashMenu(editor, { type: "alert" as const, props: { level } });
},
```

`insertOrUpdateBlockForSlashMenu` returns the inserted/updated `Block`.

**Disable the default slash menu** and render your own:

```tsx
<BlockNoteView slashMenu={false} ...>
  <SuggestionMenuController
    triggerCharacter="/"
    getItems={async (query) => { /* return DefaultReactSuggestionItem[] */ }}
    suggestionMenuComponent={CompactSlashMenu}
  />
</BlockNoteView>
```

---

## Extensions — custom keyboard shortcuts

Extensions let you add custom keymap handlers without patching BlockNote internals.

### API

```ts
import { createExtension } from "@blocknote/core";

export const myExtension = createExtension({
  key: "my-extension",          // unique string key
  keyboardShortcuts: {
    "Enter": ({ editor }) => {
      // return true  → this extension handled the key; default is suppressed
      // return false → pass through to next handler
    },
    "Mod-Enter": ({ editor }) => { ... },
  },
});
```

Wire into the editor:

```ts
useCreateBlockNote({ schema, initialContent, extensions: [myExtension] });
```

### `nestingEnter` extension

File: `client/features/notebook/nestingEnter.ts`

Overrides the `Enter` key in two cases:

| Condition | Behaviour |
|-----------|-----------|
| Cursor in **empty nested block** | Inserts a sibling paragraph at the same nesting level instead of outdenting (default BlockNote behaviour). The original empty block is removed. |
| Cursor at **end of a toggleable heading** | Inserts a new paragraph as the heading's first child, keeps the toggle open. |

Outdent is still available via **Shift-Tab** (BlockNote's built-in `unnestBlock` binding).

#### Detecting cursor position

```ts
const pos = editor.getTextCursorPosition();
// pos.block       — current Block
// pos.parentBlock — defined when nested, undefined at top level
// pos.prevBlock / pos.nextBlock — siblings
```

#### Detecting cursor-at-end via ProseMirror

```ts
const pmSel = editor.prosemirrorState.selection;
const atEnd = pmSel.$head.parentOffset === pmSel.$head.parent.content.size;
```

`editor.prosemirrorState` is the live PM state. Use it read-only in keyboard handlers; mutations go through `editor.insertBlocks` / `editor.updateBlock` / `editor.setTextCursorPosition`.

---

## Autosave with flush-on-navigate

Hook: `client/hooks/useNotebookSave.ts`

```ts
const { save, flush, status } = useNotebookSave(cardId, boardId);
```

| Return | Type | Description |
|--------|------|-------------|
| `save` | `(tabs, style?) => void` | Debounce-saves with 2 s delay |
| `flush` | `() => void` | Fires pending save immediately if one is queued |
| `status` | `"idle" \| "saving" \| "saved" \| "error"` | UI indicator state |

**Flush on unmount** to prevent data loss during SPA navigation:

```ts
useEffect(() => {
  return () => flush();
}, [flush]);
```

This is essential when `NotebookMention` navigates via `router.push`: the notebook page unmounts before the 2 s debounce fires.

---

## SSR / dynamic import

BlockNote uses browser-only APIs. Importing it at the top level causes hydration errors and intermittent crashes.

**Pattern** — create a dynamic wrapper:

```ts
// NotebookEditorDynamic.tsx
import dynamic from "next/dynamic";

export const NotebookEditor = dynamic(
  () => import("./NotebookEditor").then((m) => ({ default: m.NotebookEditor })),
  { ssr: false }
);
```

Import **only the dynamic wrapper** in page components. Never import the real editor statically from a server-rendered page.

---

## Toggle heading state

BlockNote stores toggle-open state in `localStorage` keyed by block ID:

```ts
// open
window.localStorage.setItem(`toggle-${block.id}`, "true");

// closed (or entry absent) → collapsed
window.localStorage.removeItem(`toggle-${block.id}`);
```

New toggle headings created via slash menu start **collapsed** (no `localStorage` entry).  
WitsNote sets the entry immediately after creation using `queueMicrotask` to avoid a race with the first render:

```ts
const b = insertOrUpdateBlockForSlashMenu(editor, { type: "heading", props: { level, isToggleable: true } });
queueMicrotask(() => window.localStorage.setItem(`toggle-${b.id}`, "true"));
```

---

## Known gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| Ghost blank row after slash-menu insert | `editor.insertBlocks(..., "after")` — appends sibling, leaves trigger block | Use `insertOrUpdateBlockForSlashMenu` |
| `/board//notebook/...` malformed URL | `props.boardId === ""` on legacy mentions | Fall back to `pathname.split("/")[2]` |
| `Error creating document from blocks passed as initialContent` | Empty `[]` array, SSR hydration, or unknown inline content type | Guard `initialContent = arr.length ? arr : undefined`; `dynamic(ssr:false)`; strip unknown inline types in `migrateInlineContent` |
| Enter in nested block outdents instead of staying nested | BlockNote's default `liftItem` keymap | `nestingEnter` extension overrides this |
| Toggle heading starts collapsed | No `localStorage` entry on creation | Set entry via `queueMicrotask` after `insertOrUpdateBlockForSlashMenu` |
| Unsaved edits lost on mention click | `window.open(_self)` aborts JS context before 2 s debounce fires | `router.push` + unmount `flush()` |
| Typing after alert insert spawns new paragraph | `queueMicrotask` around `setTextCursorPosition` fires after Enter event → ProseMirror processes remaining keystroke mid-cursor-move → inserts newline; also: missing `contentEditable={false}` on icon span means PM treats icon as editable area | Remove `queueMicrotask`; add `contentEditable={false}` to all non-editable sections inside custom block render |
| Same-card `?tab=` mention redirect has no effect | `useState(tabParam)` only uses mount-time value; same-card nav changes URL without remount | `useEffect([tabParam])` → `setTimeout(() => setActiveId(tabParam), 0)` |
| Clicking @mention chip does nothing | ProseMirror intercepts `mousedown` on atom inline content nodes to create `NodeSelection`; focus reset can abort navigation | Use `onMouseDown` + `e.preventDefault()` instead of `onClick`; prevents PM from claiming the event |
