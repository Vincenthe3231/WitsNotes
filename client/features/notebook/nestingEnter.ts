import { createExtension } from "@blocknote/core";
import type { Block } from "@blocknote/core";

function findBlockInTree(blocks: Block[], id: string): Block | undefined {
  for (const b of blocks) {
    if (b.id === id) return b;
    const found = findBlockInTree(b.children ?? [], id);
    if (found) return found;
  }
}

function isBlockEmpty(block: Block): boolean {
  if (!block.content || (block.content as unknown[]).length === 0) return true;
  const content = block.content as { type: string; text?: string }[];
  return (
    content.length === 1 &&
    content[0].type === "text" &&
    (content[0].text ?? "") === ""
  );
}

export const nestingEnter = createExtension({
  key: "nesting-enter",
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      const pos = editor.getTextCursorPosition();
      const block = pos.block;

      // Override 1: empty nested block → insert sibling at same level instead of outdenting
      if (isBlockEmpty(block) && pos.parentBlock) {
        const [inserted] = editor.insertBlocks([{ type: "paragraph" }], block, "after");
        editor.removeBlocks([block]);
        editor.setTextCursorPosition(inserted.id, "start");
        return true;
      }

      // Override 2: Enter at end of a toggleable heading → nest new paragraph inside
      if (
        block.type === "heading" &&
        (block.props as Record<string, unknown>).isToggleable === true
      ) {
        const pmSel = editor.prosemirrorState.selection;
        const atEnd = pmSel.$head.parentOffset === pmSel.$head.parent.content.size;
        if (atEnd) {
          editor.updateBlock(block, {
            children: [{ type: "paragraph" }, ...(block.children ?? [])],
          });
          window.localStorage.setItem(`toggle-${block.id}`, "true");
          const updated = findBlockInTree(editor.document as Block[], block.id);
          const firstChildId = updated?.children?.[0]?.id;
          if (firstChildId) {
            editor.setTextCursorPosition(firstChildId, "start");
          }
          return true;
        }
      }

      return false;
    },
  },
});
