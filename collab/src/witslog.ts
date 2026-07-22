import witslog from "@all-wits/witslog";

const APPLICATION = "collab";
let initialized = false;

export function ensureWitslog(): void {
  if (initialized) return;
  try {
    witslog.init({ createProject: true });
    witslog.installUncaughtHandler(APPLICATION);
  } catch (err) {
    console.error("[collab] witslog init failed, capture disabled:", err);
  }
  initialized = true;
}

export function logError(message: string, context?: Record<string, unknown>): void {
  try {
    witslog.error(APPLICATION, message, { context });
  } catch (err) {
    console.error("[collab] witslog.error failed:", err);
  }
}

export function logException(err: unknown, context?: Record<string, unknown>): void {
  try {
    const error = err instanceof Error ? err : new Error(String(err));
    witslog.exception(APPLICATION, error, { context });
  } catch (e) {
    console.error("[collab] witslog.exception failed:", e);
  }
}
