"use client";

import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { useAgenda } from "@/lib/api/hooks";
import { getReminderBadge } from "@/lib/dates";

export function AgendaView() {
  const router = useRouter();
  const { data: items, isLoading } = useAgenda();

  if (isLoading) {
    return <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading agenda…</p>;
  }

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <CalendarClock size={48} style={{ color: "var(--color-text-muted)", opacity: 0.4 }} />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Nothing due — set a reminder from any card&apos;s due/remind date.
        </p>
      </div>
    );
  }

  return (
    <div role="list" className="flex flex-col gap-2">
      {items.map((item) => {
        const badge = getReminderBadge(item);
        return (
          <button
            key={item.id}
            role="listitem"
            onClick={() => router.push(`/board/${item.board_id}`)}
            className="flex items-center justify-between gap-3 text-left rounded-xl p-3 cursor-pointer transition-all duration-150 hover:scale-[1.01]"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                {item.title || item.type}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {item.due_at ? "Due" : "Remind"} {new Date(item.due_at ?? item.remind_at!).toLocaleString()}
              </p>
            </div>
            {badge && (
              <span
                className="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0"
                style={{
                  background: badge.overdue ? "var(--color-danger, #DC2626)" : "var(--color-surface-glass)",
                  color: badge.overdue ? "#fff" : "var(--color-text-muted)",
                }}
              >
                {badge.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
