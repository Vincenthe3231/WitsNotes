// TypeScript port of witslog's WebSocket watch helper
// (bindings/browser/witslog-websocket.js in the witslog repo). Per
// bindings/CONTRACT.md, browser reporter code ships as a vendored file
// rather than an npm package (P10 — no native/FFI code ever runs in the
// browser), so this is a local copy of that source of truth.
//
// Returns {onClose, onDisconnect} handlers shaped to drop directly into
// HocuspocusProvider's constructor options (verified shape:
// onClose({event: CloseEvent}), onDisconnect({event: CloseEvent})).
//
// Used by client/lib/collab/useBoardDoc.ts to log abnormal WebSocket closes,
// which previously produced no log at all.

import type { WitslogEvent, WitslogReporter } from "./witslog-browser";

export interface WitslogWebSocketOptions {
  report: WitslogReporter | ((event: WitslogEvent) => void);
  tags?: string[];
  context?: Record<string, unknown>;
}

interface CloseEventLike {
  code: number;
  reason: string;
  wasClean?: boolean;
}

/** Pure — true for an abnormal close (anything but normal/going-away). */
export function isAbnormalClose(code: number): boolean {
  return code !== 1000 && code !== 1001;
}

function buildCloseEvent(
  closeEvent: CloseEventLike,
  { tags = [], context = {} }: { tags?: string[]; context?: Record<string, unknown> }
): WitslogEvent {
  const { code, reason, wasClean } = closeEvent;
  return {
    message: `WebSocket closed abnormally (code ${code})`,
    severity: "error",
    error_code: `WS_CLOSE_${code}`,
    tags: ["network", "websocket", ...tags],
    context: { ...context, ws: { code, reason, wasClean } },
  };
}

function resolveEmit(report: WitslogWebSocketOptions["report"]): (event: WitslogEvent) => void {
  if (typeof report === "function") return report;
  if (report && typeof report.enqueue === "function") return (event) => report.enqueue(event);
  throw new TypeError("witslogWebSocketWatch requires opts.report: a function(event) or a {enqueue(event)} reporter");
}

export function witslogWebSocketWatch(opts: WitslogWebSocketOptions) {
  const { tags, context } = opts;
  const emit = resolveEmit(opts.report);

  function handle({ event }: { event?: CloseEventLike } = {}) {
    if (!event || !isAbnormalClose(event.code)) return;
    emit(buildCloseEvent(event, { tags, context }));
  }

  return { onClose: handle, onDisconnect: handle };
}
