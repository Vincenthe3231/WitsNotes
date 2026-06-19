"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Loader2, X } from "lucide-react";

interface Props {
  onSubmit: (password: string) => Promise<boolean>;
  onCancel: () => void;
}

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

export function PasswordModal({ onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || cooldown > 0) return;
    setLoading(true);
    setError(null);
    const ok = await onSubmit(password);
    setLoading(false);
    if (!ok) {
      const next = attempts + 1;
      setAttempts(next);
      setPassword("");
      if (next >= MAX_ATTEMPTS) {
        setCooldown(COOLDOWN_SECONDS);
        setError(`Too many attempts. Wait ${COOLDOWN_SECONDS}s.`);
      } else {
        setError(`Incorrect password. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? "" : "s"} remaining.`);
      }
    }
  }

  const disabled = loading || cooldown > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--color-surface-glass)", backdropFilter: "blur(24px)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock size={18} style={{ color: "var(--color-primary)" }} />
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Unlock notebook</h2>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={disabled}
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          {cooldown > 0 && (
            <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
              Try again in {cooldown}s
            </p>
          )}
          <button
            type="submit"
            disabled={disabled || !password}
            className="flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
