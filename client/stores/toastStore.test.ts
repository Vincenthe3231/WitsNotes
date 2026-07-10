import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore } from "./toastStore";

function reset() {
  useToastStore.setState({ toasts: [] });
}

describe("toastStore", () => {
  beforeEach(() => {
    reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("push adds a toast with a generated id and returns that id", () => {
    const id = useToastStore.getState().push({ level: "info", message: "hi" });
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id);
    expect(toasts[0].message).toBe("hi");
    expect(toasts[0].level).toBe("info");
  });

  it("defaults ttl to 5000ms and auto-dismisses after it elapses", () => {
    useToastStore.getState().push({ level: "success", message: "done" });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(4999);
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("respects a custom ttl", () => {
    useToastStore.getState().push({ level: "warning", message: "careful", ttl: 100 });
    vi.advanceTimersByTime(99);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("ttl of 0 never auto-dismisses", () => {
    useToastStore.getState().push({ level: "error", message: "stays", ttl: 0 });
    vi.advanceTimersByTime(1_000_000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("dismiss removes only the matching toast", () => {
    const id1 = useToastStore.getState().push({ level: "info", message: "a", ttl: 0 });
    const id2 = useToastStore.getState().push({ level: "info", message: "b", ttl: 0 });

    useToastStore.getState().dismiss(id1);

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id2);
  });

  it("allows multiple toasts to coexist until dismissed/expired", () => {
    for (let i = 0; i < 5; i++) {
      useToastStore.getState().push({ level: "info", message: `t${i}`, ttl: 0 });
    }
    expect(useToastStore.getState().toasts).toHaveLength(5);
  });
});
