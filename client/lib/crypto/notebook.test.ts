import { describe, it, expect, beforeEach } from "vitest";
import {
  deriveKey, generateSalt, makeVerifier, checkVerifier,
  encryptContent, decryptContent,
  cacheKey, getCachedKey, clearCachedKey, boardVaultScope, lockAllForBoard,
} from "./notebook";

describe("vault crypto round-trip", () => {
  it("deriveKey is deterministic for the same password+salt", async () => {
    const salt = await generateSalt();
    const a = await deriveKey("correct horse", salt);
    const b = await deriveKey("correct horse", salt);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("makeVerifier/checkVerifier round-trips for the right password, rejects the wrong one", async () => {
    const salt = await generateSalt();
    const key = await deriveKey("hunter2", salt);
    const verifier = await makeVerifier(key);

    expect(await checkVerifier(key, verifier)).toBe(true);

    const wrongKey = await deriveKey("wrong password", salt);
    expect(await checkVerifier(wrongKey, verifier)).toBe(false);
  });

  it("encryptContent/decryptContent round-trips arbitrary JSON", async () => {
    const salt = await generateSalt();
    const key = await deriveKey("hunter2", salt);
    const data = { tabs: [{ id: "1", title: "Secret", blocks: [{ type: "paragraph" }] }] };

    const ciphertext = await encryptContent(key, data);
    expect(typeof ciphertext).toBe("string");
    expect(ciphertext).not.toContain("Secret");

    const decrypted = await decryptContent(key, ciphertext);
    expect(decrypted).toEqual(data);
  });

  it("decryptContent throws for the wrong key (locked content stays opaque)", async () => {
    const salt = await generateSalt();
    const key = await deriveKey("hunter2", salt);
    const wrongKey = await deriveKey("nope", salt);
    const ciphertext = await encryptContent(key, { secret: true });

    await expect(decryptContent(wrongKey, ciphertext)).rejects.toThrow();
  });
}, 20000);

describe("session key cache (per-card and board scope)", () => {
  beforeEach(() => sessionStorage.clear());

  it("caches and retrieves a key by id", () => {
    const key = new Uint8Array([1, 2, 3, 4]);
    cacheKey("card-1", key);
    expect(Array.from(getCachedKey("card-1")!)).toEqual([1, 2, 3, 4]);
  });

  it("returns null for an uncached id", () => {
    expect(getCachedKey("never-cached")).toBeNull();
  });

  it("boardVaultScope namespaces board keys separately from card ids", () => {
    expect(boardVaultScope("board-1")).toBe("board:board-1");
    cacheKey(boardVaultScope("board-1"), new Uint8Array([9]));
    expect(getCachedKey("board-1")).toBeNull();
    expect(getCachedKey(boardVaultScope("board-1"))).not.toBeNull();
  });

  it("lockAllForBoard clears the board key and every listed notebook card key", () => {
    const boardId = "board-1";
    cacheKey(boardVaultScope(boardId), new Uint8Array([1]));
    cacheKey("notebook-a", new Uint8Array([2]));
    cacheKey("notebook-b", new Uint8Array([3]));
    cacheKey("unrelated-card", new Uint8Array([4]));

    lockAllForBoard(boardId, ["notebook-a", "notebook-b"]);

    expect(getCachedKey(boardVaultScope(boardId))).toBeNull();
    expect(getCachedKey("notebook-a")).toBeNull();
    expect(getCachedKey("notebook-b")).toBeNull();
    expect(getCachedKey("unrelated-card")).not.toBeNull();
  });

  it("clearCachedKey only removes the targeted id", () => {
    cacheKey("a", new Uint8Array([1]));
    cacheKey("b", new Uint8Array([2]));
    clearCachedKey("a");
    expect(getCachedKey("a")).toBeNull();
    expect(getCachedKey("b")).not.toBeNull();
  });
});
