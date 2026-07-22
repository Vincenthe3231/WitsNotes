import { describe, it, expect, vi, afterEach } from "vitest";
import WitslogBrowser from "./witslog-browser";

// jsdom (vitest.config.ts) gives us a real `window`/`document`/`console`, so
// captureConsole's `console.error`/`console.warn` patching and the
// capture-phase resource-error listener actually run here — unlike the
// upstream witslog repo's node:test suite, which has to stub `window`.

function stubFetch() {
  let capturedBody: string | null = null;
  const fetchSpy = vi.fn((_url: string, opts: RequestInit) => {
    capturedBody = opts.body as string;
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
  vi.stubGlobal("fetch", fetchSpy);
  return () => (capturedBody ? JSON.parse(capturedBody) : null);
}

describe("WitslogBrowser captureConsole", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is off by default — does not patch console.error/warn", () => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const reporter = WitslogBrowser.init({ endpoint: "/ingest" });
    expect(console.error).toBe(originalError);
    expect(console.warn).toBe(originalWarn);
    reporter._restoreConsole?.();
  });

  it("captureConsole: true patches console.error, still calls the original, and enqueues an event", () => {
    const getBody = stubFetch();
    const originalError = console.error;
    const calls: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      calls.push(args);
    };
    const stubbed = console.error;

    const reporter = WitslogBrowser.init({ endpoint: "/ingest", captureConsole: true });
    expect(console.error).not.toBe(stubbed);

    console.error("boom", "detail");
    expect(calls).toEqual([["boom", "detail"]]);

    reporter.flush();
    const body = getBody() as { events: Array<{ message: string; severity: string; tags: string[] }> };
    expect(body.events).toHaveLength(1);
    expect(body.events[0].message).toContain("boom");
    expect(body.events[0].severity).toBe("error");
    expect(body.events[0].tags).toEqual(["console"]);

    reporter._restoreConsole?.();
    expect(console.error).toBe(stubbed);
    console.error = originalError;
  });

  it("captureConsole: true patches console.warn at severity warn", () => {
    const getBody = stubFetch();
    const originalWarn = console.warn;
    console.warn = () => {};

    const reporter = WitslogBrowser.init({ endpoint: "/ingest", captureConsole: true });
    console.warn("careful now");
    reporter.flush();

    const body = getBody() as { events: Array<{ severity: string }> };
    expect(body.events[0].severity).toBe("warn");

    reporter._restoreConsole?.();
    console.warn = originalWarn;
  });

  it("re-entrancy guard prevents an infinite loop when reporting itself logs", () => {
    const getBody = stubFetch();
    const originalError = console.error;
    let originalCallCount = 0;
    console.error = () => {
      originalCallCount += 1;
    };

    const reporter = WitslogBrowser.init({ endpoint: "/ingest", captureConsole: true });

    const trap = {
      toJSON() {
        console.error("nested from toJSON");
        return "trap";
      },
    };

    expect(() => console.error("outer", trap)).not.toThrow();
    // Original console.error ran for both the outer and nested call — real
    // developer output must never be swallowed by the guard.
    expect(originalCallCount).toBe(2);

    reporter.flush();
    const body = getBody() as { events: Array<{ message: string }> };
    // Only the outer call's enqueue went through; the nested call's own
    // enqueue was skipped by the guard (no double-count, no infinite loop).
    expect(body.events).toHaveLength(1);
    expect(body.events[0].message).toContain("outer");

    reporter._restoreConsole?.();
    console.error = originalError;
  });
});
