import { describe, it, expect, vi, afterEach } from "vitest";
import { uploadAttachment } from "./boards";

type FakeXhr = {
  withCredentials: boolean;
  timeout: number;
  status: number;
  responseText: string;
  upload: { onprogress: ((e: ProgressEvent) => void) | null };
  open: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  ontimeout: (() => void) | null;
  onabort: (() => void) | null;
};

function stubXhr(overrides: Partial<FakeXhr> = {}): FakeXhr {
  const xhr: FakeXhr = {
    withCredentials: false,
    timeout: 0,
    status: 0,
    responseText: "",
    upload: { onprogress: null },
    open: vi.fn(),
    send: vi.fn(),
    onload: null,
    onerror: null,
    ontimeout: null,
    onabort: null,
    ...overrides,
  };
  // Constructor must return the object (non-arrow fn so `new` works)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.stubGlobal("XMLHttpRequest", function (this: unknown) { return xhr; } as unknown as typeof XMLHttpRequest);
  return xhr;
}

afterEach(() => vi.unstubAllGlobals());

describe("uploadAttachment", () => {
  it("resolves with parsed response on 201", async () => {
    const payload = { id: "att-1", url: "/f/img.png", mime: "image/png", size: 1024, original_name: "img.png" };
    const xhr = stubXhr({ status: 201, responseText: JSON.stringify(payload) });

    const promise = uploadAttachment(new File(["x"], "img.png", { type: "image/png" }), { cardId: "c1" });
    xhr.onload!();

    const result = await promise;
    expect(result).toEqual(payload);
    expect(xhr.open).toHaveBeenCalledWith("POST", "/api/proxy/attachments");
  });

  it("rejects on non-2xx status", async () => {
    const xhr = stubXhr({ status: 422, responseText: '{"message":"Unprocessable"}' });

    const promise = uploadAttachment(new File(["x"], "img.png", { type: "image/png" }), { cardId: "c1" });
    xhr.onload!();

    await expect(promise).rejects.toThrow("Upload failed: 422");
  });

  it("rejects on network error", async () => {
    const xhr = stubXhr();

    const promise = uploadAttachment(new File(["x"], "img.png", { type: "image/png" }), { cardId: "c1" });
    xhr.onerror!();

    await expect(promise).rejects.toThrow("network error");
  });

  it("rejects on timeout and timeout is 30s", async () => {
    const xhr = stubXhr();

    const promise = uploadAttachment(new File(["x"], "img.png", { type: "image/png" }), { cardId: "c1" });

    expect(xhr.timeout).toBe(30_000);
    xhr.ontimeout!();

    await expect(promise).rejects.toThrow("timeout");
  });

  it("calls onProgress with percentage", async () => {
    const payload = { id: "a", url: "/x", mime: "image/png", size: 1, original_name: "x.png" };
    const xhr = stubXhr({ status: 201, responseText: JSON.stringify(payload) });

    const onProgress = vi.fn();
    const promise = uploadAttachment(new File(["x"], "img.png"), { cardId: "c1", onProgress });

    xhr.upload.onprogress!({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);

    expect(onProgress).toHaveBeenCalledWith(50);

    xhr.onload!();
    await promise;
  });
});
