import { describe, it, expect } from "vitest";
import { getReminderBadge } from "./dates";

const NOW = new Date("2026-01-01T12:00:00.000Z");

describe("getReminderBadge", () => {
  it("returns null when neither due_at nor remind_at is set", () => {
    expect(getReminderBadge({}, NOW)).toBeNull();
  });

  it("prefers due_at over remind_at when both are set", () => {
    const badge = getReminderBadge(
      { due_at: "2026-01-02T12:00:00.000Z", remind_at: "2026-01-01T13:00:00.000Z" },
      NOW
    );
    expect(badge?.label).toBe("in 1d");
  });

  it("marks a past date as overdue", () => {
    const badge = getReminderBadge({ due_at: "2026-01-01T11:00:00.000Z" }, NOW);
    expect(badge?.overdue).toBe(true);
    expect(badge?.label).toBe("1h ago");
  });

  it("marks a future date as not overdue", () => {
    const badge = getReminderBadge({ due_at: "2026-01-01T13:00:00.000Z" }, NOW);
    expect(badge?.overdue).toBe(false);
    expect(badge?.label).toBe("in 1h");
  });

  it("formats minutes when under an hour away", () => {
    const badge = getReminderBadge({ remind_at: "2026-01-01T12:30:00.000Z" }, NOW);
    expect(badge?.label).toBe("in 30m");
  });

  it("formats days when more than 24 hours away", () => {
    const badge = getReminderBadge({ due_at: "2026-01-05T12:00:00.000Z" }, NOW);
    expect(badge?.label).toBe("in 4d");
  });
});
