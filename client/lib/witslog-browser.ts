// TypeScript port of witslog's browser reporter
// (bindings/browser/witslog-browser.js in the witslog repo). Per
// bindings/CONTRACT.md, the browser reporter ships as a raw script/vendored
// file rather than an npm package (P10 — no native/FFI code ever runs in
// the browser), so this is a local copy of that source of truth, not a
// build-time import. Extended (beyond the upstream .js) to also carry
// `error_code`/`tags` per event, matching the ingest-core.js contract both
// `witslogBrowserIngest` and `witslogNextIngest` now accept — needed so
// frameworks/react-query.js's captured error_code/tags survive ingest.
// Also ported: `captureConsole` (console.error/warn + resource-load capture,
// added upstream alongside witslog's `@all-wits/witslog/browser` npm
// subpath) — keep this file in sync with the upstream canonical source when
// either changes.
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
  /**
   * Also capture `console.error` (severity `error`) / `console.warn`
   * (severity `warn`) calls — tagged `['console']` — and capture-phase
   * resource-load failures (`<img>`/`<script>`/`<link>` 404s etc, tagged
   * `['resource']`), which don't throw and are otherwise invisible to
   * `window.onerror`/`unhandledrejection`. Default `false` — opt-in because
   * it patches a global and can be noisy. Enable on at most one
   * `WitslogBrowser.init(...)` instance per app to avoid double-wrapping
   * `console.error` (see app/providers.tsx vs lib/api/client.ts).
   */
  captureConsole?: boolean;
}

export interface WitslogReporter {
  flush: () => void;
  enqueue: (event: WitslogEvent) => void;
  /** Test/cleanup hook — undoes console patching + the capture-phase
   * resource listener if `captureConsole` was on. */
  _restoreConsole?: () => void;
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

/** Pure — best-effort stringification of a single console.error/warn arg. */
function stringifyConsoleArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.message || String(arg);
  try {
    return JSON.stringify(arg) ?? String(arg);
  } catch {
    return String(arg);
  }
}

/** Pure — joins console.error/warn args into one message string. */
function formatConsoleArgs(args: unknown[]): string {
  return args.map(stringifyConsoleArg).join(" ");
}

/**
 * Installs `window.onerror` + `unhandledrejection` handlers (plus, when
 * enabled, `console.error`/`console.warn` patching and capture-phase
 * resource-load error capture) that batch events and ship them via
 * `navigator.sendBeacon` (survives page unload) with a
 * `fetch(..., {keepalive:true})` fallback, flushing on
 * `visibilitychange`→hidden and `pagehide`. Returns `{flush, enqueue}` —
 * `enqueue` is also what `frameworks/react-query.js`'s `attachWitslog`
 * calls as its `report` sink.
 */
function init(config: WitslogBrowserConfig): WitslogReporter {
  const { endpoint, app = "browser", sampleRate = 1, captureConsole = false } = config;
  if (!endpoint) {
    throw new TypeError("endpoint is required");
  }

  let queue: WitslogEvent[] = [];
  // Re-entrancy guard: reporting a captured console.error must never itself
  // call console.error/warn and recurse back into the patched methods —
  // that would loop forever the moment reporting itself errors.
  let inReporter = false;

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
    // Script errors dispatch directly at Window (event.target === window),
    // invoking this bubble-registered listener once — unaffected by the
    // separate capture-phase resource listener below.
    enqueue(
      makeErrorEvent(event.message, {
        stacktrace: event.error && event.error.stack,
        context: { url: event.filename, line: event.lineno, col: event.colno },
      })
    );
  }

  /**
   * Capture-phase only. Resource-load failures (img/script/link 404s etc.)
   * dispatch a non-bubbling `error` event targeted at the failed element —
   * `window`'s bubble-phase listener (`onError` above) never sees it; only a
   * capture-phase listener on an ancestor (window) observes it as the event
   * travels down to its target. Script errors are dispatched AT window
   * (event.target === window) and are already handled by `onError` above —
   * skip those here so they aren't enqueued twice.
   */
  function onResourceError(event: Event) {
    if (event.target === window) return;
    const el = event.target as (HTMLElement & { src?: string; href?: string }) | null;
    if (!el) return;
    const src = el.src || el.href || "";
    enqueue(
      makeErrorEvent("resource load failed", {
        tags: ["resource"],
        context: { url: src, tag: el.tagName && el.tagName.toLowerCase() },
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

  let restoreConsole: (() => void) | null = null;

  function patchConsole(): (() => void) | null {
    if (typeof console === "undefined") return null;
    const originalError = console.error;
    const originalWarn = console.warn;
    if (typeof originalError !== "function" && typeof originalWarn !== "function") return null;

    function wrap(original: typeof console.error, severity: "error" | "warn") {
      if (typeof original !== "function") return original;
      return function patched(...args: unknown[]) {
        // Always call the original first — never swallow developer output,
        // even if reporting below throws or is skipped by the guard.
        original.apply(console, args as []);
        if (inReporter) return;
        inReporter = true;
        try {
          const firstError = args.find((a): a is Error => a instanceof Error);
          enqueue(
            makeErrorEvent(formatConsoleArgs(args), {
              severity,
              exception: firstError ? firstError.name : undefined,
              stacktrace: firstError && firstError.stack,
              tags: ["console"],
            })
          );
        } catch {
          /* never let capture itself throw into caller's console.error call */
        } finally {
          inReporter = false;
        }
      };
    }

    console.error = wrap(originalError, "error") as typeof console.error;
    console.warn = wrap(originalWarn, "warn") as typeof console.warn;

    return function restore() {
      console.error = originalError;
      console.warn = originalWarn;
    };
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
    if (captureConsole) {
      restoreConsole = patchConsole();
      // Resource-load errors (img/script/link) don't bubble — only a
      // capture-phase listener observes them. Bundled under the same
      // opt-in as console capture.
      window.addEventListener("error", onResourceError, true);
    }
  }

  return {
    flush,
    enqueue,
    _restoreConsole: () => {
      if (restoreConsole) restoreConsole();
      if (typeof window !== "undefined") {
        window.removeEventListener("error", onResourceError, true);
      }
    },
  };
}

const WitslogBrowser = { init, buildBatch, makeErrorEvent };
export default WitslogBrowser;
