// TypeScript port of witslog's browser reporter
// (bindings/browser/witslog-browser.js in the witslog repo). Per
// bindings/CONTRACT.md, the browser reporter ships as a raw script/vendored
// file rather than an npm package (P10 — no native/FFI code ever runs in
// the browser), so this is a local copy of that source of truth, not a
// build-time import. Extended (beyond the upstream .js) to also carry
// `error_code`/`tags` per event, matching the ingest-core.js contract both
// `witslogBrowserIngest` and `witslogNextIngest` now accept — needed so
// frameworks/react-query.js's captured error_code/tags survive ingest.
//
// Used by app/providers.tsx to ship both raw window.onerror/unhandledrejection
// captures AND frameworks/react-query.js's attachWitslog() events to the
// server-side ingest endpoint (app/api/witslog-ingest/route.ts).

export interface WitslogEvent {
  message: string;
  severity?: "error" | "warn";
  exception?: string;
  stacktrace?: string;
  error_code?: string;
  correlation_id?: string;
  tags?: string[];
  context?: Record<string, unknown>;
}

export interface WitslogBrowserConfig {
  endpoint: string;
  app?: string;
  sampleRate?: number;
}

export interface WitslogReporter {
  flush: () => void;
  enqueue: (event: WitslogEvent) => void;
}

interface IngestBatchEvent {
  message: string;
  severity: string;
  exception?: string;
  stacktrace?: string;
  error_code?: string;
  correlation_id?: string;
  tags?: string[];
  context?: Record<string, unknown>;
}

/** Pure — builds the ingest batch body. */
function buildBatch(events: WitslogEvent[], meta: { app: string }) {
  return {
    application: meta.app,
    events: events.map(
      (e): IngestBatchEvent => ({
        message: e.message,
        severity: e.severity || "error",
        exception: e.exception,
        stacktrace: e.stacktrace,
        error_code: e.error_code,
        correlation_id: e.correlation_id,
        tags: e.tags,
        context: e.context,
      })
    ),
  };
}

/** Pure — normalizes a raw browser error into the batch event shape. */
function makeErrorEvent(message: unknown, opts: Partial<WitslogEvent> = {}): WitslogEvent {
  return {
    message: String(message == null ? "error" : message),
    severity: opts.severity || "error",
    exception: opts.exception,
    stacktrace: opts.stacktrace,
    error_code: opts.error_code,
    tags: opts.tags,
    context: opts.context,
  };
}

/**
 * Installs `window.onerror` + `unhandledrejection` handlers that batch
 * events and ship them via `navigator.sendBeacon` (survives page unload)
 * with a `fetch(..., {keepalive:true})` fallback, flushing on
 * `visibilitychange`→hidden and `pagehide`. Returns `{flush, enqueue}` —
 * `enqueue` is also what `frameworks/react-query.js`'s `attachWitslog`
 * calls as its `report` sink.
 */
function init(config: WitslogBrowserConfig): WitslogReporter {
  const { endpoint, app = "browser", sampleRate = 1 } = config;
  if (!endpoint) {
    throw new TypeError("endpoint is required");
  }

  let queue: WitslogEvent[] = [];

  function shouldSample() {
    return sampleRate >= 1 || Math.random() < sampleRate;
  }

  function enqueue(event: WitslogEvent) {
    if (!shouldSample()) return;
    queue.push(event);
  }

  function flush() {
    if (queue.length === 0) return;
    const batch = buildBatch(queue, { app });
    queue = [];
    const body = JSON.stringify(batch);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) {
        return;
      }
    }
    if (typeof fetch === "function") {
      fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        /* best-effort — never let reporting failures surface to the app */
      });
    }
  }

  function onError(event: ErrorEvent) {
    enqueue(
      makeErrorEvent(event.message, {
        stacktrace: event.error && event.error.stack,
        context: { url: event.filename, line: event.lineno, col: event.colno },
      })
    );
  }

  function onRejection(event: PromiseRejectionEvent) {
    const reason = event.reason;
    const message = reason && reason.message ? reason.message : reason;
    enqueue(
      makeErrorEvent(message, {
        exception: "UnhandledRejection",
        stacktrace: reason && reason.stack,
      })
    );
  }

  if (typeof window !== "undefined") {
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("pagehide", flush);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
    }
  }

  return { flush, enqueue };
}

const WitslogBrowser = { init, buildBatch, makeErrorEvent };
export default WitslogBrowser;
