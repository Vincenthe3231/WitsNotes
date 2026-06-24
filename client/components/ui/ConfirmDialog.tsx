"use client";

import { useConfirmStore } from "@/stores/confirmStore";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function ConfirmDialog() {
  const pending = useConfirmStore((s) => s.pending);
  const resolve = useConfirmStore((s) => s.resolve);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!pending) return;
    // Focus Cancel button (autofocused)
    cancelRef.current?.focus();

    // Close on Esc
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resolve(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pending, resolve]);

  if (!pending) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => resolve(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 49,
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 50,
          background: "var(--color-surface-glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
          minWidth: 300,
          maxWidth: 420,
          animation: prefersReducedMotion ? "none" : `fadeIn 150ms ease-out`,
        }}
      >
        {pending.title && (
          <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            {pending.title}
          </h2>
        )}

        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: 14,
            color: "var(--color-text)",
            lineHeight: 1.5,
          }}
        >
          {pending.message}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
          }}
        >
          <button
            ref={cancelRef}
            onClick={() => resolve(false)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              minWidth: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 150ms",
            }}
            onFocus={(e) => {
              (e.target as HTMLElement).style.background = "var(--color-border)";
            }}
            onBlur={(e) => {
              (e.target as HTMLElement).style.background = "var(--color-surface)";
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "var(--color-border)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "var(--color-surface)";
            }}
          >
            Cancel
          </button>

          <button
            onClick={() => resolve(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: pending.danger ? "#ef4444" : "var(--color-primary)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              minWidth: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "opacity 150ms",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.opacity = "1";
            }}
            onFocus={(e) => {
              (e.target as HTMLElement).style.opacity = "0.9";
            }}
            onBlur={(e) => {
              (e.target as HTMLElement).style.opacity = "1";
            }}
          >
            {pending.danger ? "Delete" : "Confirm"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        }
      `}</style>
    </>
  );
}
