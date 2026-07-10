import { describe, it, expect, beforeEach } from "vitest";
import { useConfirmStore } from "./confirmStore";

function reset() {
  useConfirmStore.setState({ pending: null, resolver: null });
}

describe("confirmStore", () => {
  beforeEach(reset);

  it("confirm sets pending options and returns a pending promise", () => {
    const promise = useConfirmStore.getState().confirm({ message: "Delete this?" });
    expect(useConfirmStore.getState().pending).toEqual({ message: "Delete this?" });
    expect(promise).toBeInstanceOf(Promise);
    // resolve to avoid an unhandled/dangling promise
    useConfirmStore.getState().resolve(false);
  });

  it("resolve(true) resolves the confirm() promise with true and clears pending", async () => {
    const promise = useConfirmStore.getState().confirm({ message: "Proceed?", danger: true });
    useConfirmStore.getState().resolve(true);

    await expect(promise).resolves.toBe(true);
    expect(useConfirmStore.getState().pending).toBeNull();
    expect(useConfirmStore.getState().resolver).toBeNull();
  });

  it("resolve(false) resolves the confirm() promise with false", async () => {
    const promise = useConfirmStore.getState().confirm({ message: "Cancel?" });
    useConfirmStore.getState().resolve(false);

    await expect(promise).resolves.toBe(false);
  });

  it("resolve() is a no-op when there is no pending confirmation", () => {
    expect(() => useConfirmStore.getState().resolve(true)).not.toThrow();
    expect(useConfirmStore.getState().pending).toBeNull();
  });

  it("a second confirm() call replaces the pending options (last-wins) before the first resolves", async () => {
    const first = useConfirmStore.getState().confirm({ message: "First" });
    const second = useConfirmStore.getState().confirm({ message: "Second" });

    expect(useConfirmStore.getState().pending).toEqual({ message: "Second" });

    // Only one resolver slot exists — resolving now settles whichever call is
    // currently pending (the second). This documents current single-slot
    // behavior rather than asserting an ideal queueing semantic.
    useConfirmStore.getState().resolve(true);
    await expect(second).resolves.toBe(true);
    expect(useConfirmStore.getState().pending).toBeNull();

    // The first promise is intentionally left unsettled by design (single
    // resolver slot) — nothing further to assert on `first` here.
    void first;
  });
});
