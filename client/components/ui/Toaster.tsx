"use client";

import { useToastStore } from "@/stores/toastStore";
import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ICON_MAP = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const COLOR_MAP = {
  error: "var(--color-danger, #ef4444)",
  warning: "var(--color-warning)",
  info: "var(--color-primary)",
  success: "var(--color-success, #10b981)",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.level];
        const color = COLOR_MAP[toast.level];
        const isError = toast.level === "error";

        return (
          <div
            key={toast.id}
            role={isError ? "alert" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 12,
              marginBottom: 8,
              borderRadius: 12,
              background: "var(--color-surface-glass)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              color: "var(--color-text)",
              fontSize: 14,
              minWidth: 280,
              maxWidth: 400,
              pointerEvents: "auto",
              animation: prefersReducedMotion
                ? "none"
                : `slideInUp 150ms ease-out`,
              opacity: 1,
              transform: "translateY(0)",
            }}
          >
            {Icon && (
              <Icon
                size={18}
                style={{
                  flexShrink: 0,
                  color: color,
                }}
              />
            )}
            <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              style={{
                padding: 4,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
                minWidth: 44,
                minHeight: 44,
                marginRight: -4,
                marginTop: -4,
                marginBottom: -4,
              }}
              aria-label="Dismiss notification"
              onFocus={(e) => {
                (e.target as HTMLElement).style.background = "var(--color-surface)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.background = "transparent";
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(0); }
            to { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
    </div>
  );
}
