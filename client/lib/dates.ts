export interface ReminderBadge {
  label: string;
  overdue: boolean;
}

/**
 * Computes the due/remind badge for a card: due_at takes priority over
 * remind_at when both are set (due date is the more actionable signal).
 * Returns null when neither is set.
 */
export function getReminderBadge(
  card: { due_at?: string | null; remind_at?: string | null },
  now: Date = new Date()
): ReminderBadge | null {
  const target = card.due_at ?? card.remind_at;
  if (!target) return null;

  const targetDate = new Date(target);
  const overdue = targetDate.getTime() < now.getTime();
  const label = formatRelative(targetDate, now);
  return { label, overdue };
}

function formatRelative(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const abs = Math.abs(diffMin);

  if (abs < 60) return diffMin >= 0 ? `in ${abs}m` : `${abs}m ago`;

  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return diffHr >= 0 ? `in ${diffHr}h` : `${Math.abs(diffHr)}h ago`;

  const diffDay = Math.round(diffHr / 24);
  return diffDay >= 0 ? `in ${diffDay}d` : `${Math.abs(diffDay)}d ago`;
}
