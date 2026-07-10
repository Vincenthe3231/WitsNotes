// Client-side only — never import in server components
// Turbopack puts libsodium constants as named exports on the module namespace, not on mod.default.
// Singleton + Proxy: one init, constants fall back to namespace when missing from default.
let _sodium: Promise<typeof import("libsodium-wrappers-sumo")> | null = null;

async function getSodium() {
  if (!_sodium) {
    _sodium = import("libsodium-wrappers-sumo").then(async (mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ns = mod as any;
      const sodium = ns.default ?? ns;
      await sodium.ready;
      return sodium as typeof import("libsodium-wrappers-sumo");
    });
  }
  return _sodium;
}

const VERIFIER_CONSTANT = new Uint8Array(32).fill(0xab);

export async function deriveKey(password: string, saltHex: string): Promise<Uint8Array> {
  const sodium = await getSodium();
  const salt = sodium.from_hex(saltHex);
  return sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}

export async function generateSalt(): Promise<string> {
  const sodium = await getSodium();
  return sodium.to_hex(sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES));
}

export async function makeVerifier(key: Uint8Array): Promise<string> {
  const sodium = await getSodium();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const cipher = sodium.crypto_secretbox_easy(VERIFIER_CONSTANT, nonce, key);
  const combined = new Uint8Array(nonce.length + cipher.length);
  combined.set(nonce);
  combined.set(cipher, nonce.length);
  return sodium.to_base64(combined);
}

export async function checkVerifier(key: Uint8Array, verifierB64: string): Promise<boolean> {
  try {
    const sodium = await getSodium();
    const combined = sodium.from_base64(verifierB64);
    const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const cipher = combined.slice(sodium.crypto_secretbox_NONCEBYTES);
    const plain = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
    return plain.every((b, i) => b === VERIFIER_CONSTANT[i]);
  } catch {
    return false;
  }
}

export async function encryptContent(key: Uint8Array, data: unknown): Promise<string> {
  const sodium = await getSodium();
  const json = JSON.stringify(data);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const cipher = sodium.crypto_secretbox_easy(json, nonce, key);
  const combined = new Uint8Array(nonce.length + cipher.length);
  combined.set(nonce);
  combined.set(cipher, nonce.length);
  return sodium.to_base64(combined);
}

export async function decryptContent(key: Uint8Array, ciphertextB64: string): Promise<unknown> {
  const sodium = await getSodium();
  const combined = sodium.from_base64(ciphertextB64);
  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const cipher = combined.slice(sodium.crypto_secretbox_NONCEBYTES);
  const plain = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
  return JSON.parse(new TextDecoder().decode(plain));
}

export function cacheKey(cardId: string, key: Uint8Array): void {
  sessionStorage.setItem(`vault_key_${cardId}`, JSON.stringify(Array.from(key)));
}

export function getCachedKey(cardId: string): Uint8Array | null {
  const raw = sessionStorage.getItem(`vault_key_${cardId}`);
  if (!raw) return null;
  return new Uint8Array(JSON.parse(raw) as number[]);
}

export function clearCachedKey(cardId: string): void {
  sessionStorage.removeItem(`vault_key_${cardId}`);
}

/**
 * Scope key for a board-level vault (reuses the per-card cache/get/clear
 * helpers above — they're keyed by an arbitrary string id, not just card ids).
 */
export function boardVaultScope(boardId: string): string {
  return `board:${boardId}`;
}

/**
 * "Lock all" — reconciles the board-level lock with the pre-existing
 * card-level notebook lock: clears the cached board key plus every
 * encrypted notebook card's cached key, so the whole board re-prompts.
 */
export function lockAllForBoard(boardId: string, notebookCardIds: string[]): void {
  clearCachedKey(boardVaultScope(boardId));
  notebookCardIds.forEach(clearCachedKey);
}
