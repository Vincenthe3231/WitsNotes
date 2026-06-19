"use client";

import { useState } from "react";
import { Lock, X } from "lucide-react";

interface Props {
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export function SetPasswordModal({ onSubmit, onCancel }: Props) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim()) { setError("Password cannot be empty."); return; }
    if (pw !== confirm) { setError("Passwords do not match."); return; }
    onSubmit(pw);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--color-surface-glass)", backdropFilter: "blur(24px)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock size={18} style={{ color: "var(--color-primary)" }} />
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Set password</h2>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={!pw || !confirm}
            className="py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            Lock notebook
          </button>
        </form>
      </div>
    </div>
  );
}
