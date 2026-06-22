"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import { useRouter, usePathname } from "next/navigation";

<<<<<<< HEAD
type MentionProps = { boardId: string; cardId: string; tabId: string; label: string };
=======
type MentionProps = { boardId: string; cardId: string; tabId: string; sectionId?: string; label: string };
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad

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
<<<<<<< HEAD
        router.push(props.tabId ? `${base}?tab=${props.tabId}` : base);
=======
        const url = props.tabId
          ? `${base}?tab=${props.tabId}${props.sectionId ? `#${props.sectionId}` : ""}`
          : base;
        router.push(url);
        // Scroll to section if specified, after a brief delay for navigation
        if (props.sectionId) {
          setTimeout(() => {
            const element = document.getElementById(props.sectionId!);
            element?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
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
<<<<<<< HEAD
=======
      sectionId: { default: "" },
>>>>>>> 58553d77e51c77a7200c4401cda65debff7b21ad
      label: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ inlineContent: { props } }) => <MentionChip props={props} />,
  }
);
