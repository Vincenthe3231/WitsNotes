"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import { useRouter, usePathname } from "next/navigation";

type MentionProps = { boardId: string; cardId: string; tabId: string; label: string };

function MentionChip({ props }: { props: MentionProps }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <span
      style={{
        background: "var(--color-primary-alpha, rgba(13,148,136,0.12))",
        color: "var(--color-primary)",
        borderRadius: 4,
        padding: "1px 6px",
        cursor: "pointer",
        fontSize: "0.9em",
      }}
      onMouseDown={(e) => {
        // Prevent ProseMirror from intercepting the click to create a NodeSelection
        e.preventDefault();
        // boardId may be "" for legacy mentions — fall back to current URL segment
        const boardId = props.boardId || pathname?.split("/")[2] || "";
        const base = `/board/${boardId}/notebook/${props.cardId}`;
        router.push(props.tabId ? `${base}?tab=${props.tabId}` : base);
      }}
    >
      @ {props.label}
    </span>
  );
}

export const NotebookMention = createReactInlineContentSpec(
  {
    type: "notebookMention" as const,
    propSchema: {
      boardId: { default: "" },
      cardId: { default: "" },
      tabId: { default: "" },
      label: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ inlineContent: { props } }) => <MentionChip props={props} />,
  }
);
