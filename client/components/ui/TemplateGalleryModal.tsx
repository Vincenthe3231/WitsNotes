"use client";

import { X, LayoutTemplate, Loader2 } from "lucide-react";
import { useTemplates, useUseTemplate } from "@/lib/api/hooks";

interface Props {
  onClose: () => void;
  onCreated: (boardId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  storyboard: "Storyboard",
  "weekly-schedule": "Weekly Schedule",
  "project-plan": "Project Plan",
  "team-plan": "Team Plan",
  creative: "Creative",
};

export function TemplateGalleryModal({ onClose, onCreated }: Props) {
  const { data: templates, isLoading } = useTemplates();
  const { mutate: applyTemplate, isPending, variables } = useUseTemplate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] rounded-2xl p-6 shadow-2xl overflow-y-auto"
        style={{ background: "var(--color-surface-glass)", backdropFilter: "blur(24px)", border: "1px solid var(--color-border)" }}
        role="dialog"
        aria-label="Template gallery"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} style={{ color: "var(--color-primary)" }} />
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Start from a template</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer"
            style={{ background: "transparent", border: "none", color: "var(--color-text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {isLoading && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading templates…</p>
        )}

        {!isLoading && (templates?.length ?? 0) === 0 && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>More templates coming soon.</p>
        )}

        <div role="list" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates?.map((template) => {
            const busy = isPending && variables?.templateId === template.id;
            return (
              <button
                key={template.id}
                role="listitem"
                disabled={isPending}
                onClick={() =>
                  applyTemplate(
                    { templateId: template.id },
                    { onSuccess: (board) => onCreated(board.id) }
                  )
                }
                className="text-left rounded-xl p-4 cursor-pointer transition-all duration-150 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-default"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div
                  className="rounded-lg mb-3 flex items-center justify-center"
                  style={{ height: 80, background: "var(--color-surface-glass)" }}
                >
                  <LayoutTemplate size={22} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{template.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {CATEGORY_LABELS[template.category] ?? template.category}
                </p>
                {busy && (
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--color-primary)" }}>
                    <Loader2 size={12} className="animate-spin" /> Creating board…
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
