"use client";

import { Node } from "@tiptap/core";
import { defaultProps, createBlockSpecFromTiptapNode } from "@blocknote/core";

export const ALERT_TYPES = {
  info:    { icon: "ℹ", color: "#3b82f6" },
  warning: { icon: "⚠", color: "#f59e0b" },
  error:   { icon: "✖", color: "#ef4444" },
  success: { icon: "✓", color: "#10b981" },
} as const;

export type AlertLevel = keyof typeof ALERT_TYPES;

const alertPropSchema = {
  textAlignment: defaultProps.textAlignment,
  textColor: defaultProps.textColor,
  backgroundColor: defaultProps.backgroundColor,
  level: {
    default: "info" as AlertLevel,
    values: ["info", "warning", "error", "success"] as const,
  },
} as const;

const AlertTiptapNode = Node.create({
  name: "alert",
  content: "inline*",
  group: "blockContent",

  addAttributes() {
    return {
      level: { default: "info" },
      textAlignment: { default: "left" },
      textColor: { default: "default" },
      backgroundColor: { default: "default" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-content-type="alert"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-content-type": "alert", ...HTMLAttributes }, 0];
  },

  addNodeView() {
    return ({ node }) => {
      const getLevel = (n: typeof node) =>
        (n.attrs.level in ALERT_TYPES ? n.attrs.level : "info") as AlertLevel;

      let level = getLevel(node);
      let { icon, color } = ALERT_TYPES[level];

      const dom = document.createElement("div");
      dom.style.cssText = `display:flex;gap:8px;padding:8px 12px;border-radius:8px;background:${color}18;border-left:3px solid ${color};margin:2px 0;align-items:flex-start`;

      const iconEl = document.createElement("div");
      iconEl.contentEditable = "false";
      iconEl.style.cssText = `flex-shrink:0;line-height:1.6;color:${color};user-select:none`;
      iconEl.textContent = icon;

      const contentDOM = document.createElement("div");
      contentDOM.style.cssText = "flex-grow:1;min-width:0;outline:none";

      dom.appendChild(iconEl);
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type.name !== "alert") return false;
          const newLevel = getLevel(updatedNode);
          if (newLevel !== level) {
            level = newLevel;
            ({ icon, color } = ALERT_TYPES[level]);
            iconEl.textContent = icon;
            iconEl.style.color = color;
            dom.style.background = `${color}18`;
            dom.style.borderLeft = `3px solid ${color}`;
          }
          return true;
        },
      };
    };
  },
});

export const Alert = createBlockSpecFromTiptapNode(
  { node: AlertTiptapNode, type: "alert" as const, content: "inline" as const },
  alertPropSchema
);
