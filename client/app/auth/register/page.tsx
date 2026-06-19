"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(null);
    setLoading(true);
    try {
      const user = await register({ name, email, password, password_confirmation: confirm });
      setUser(user);
      router.replace("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })
          ?.response?.data?.errors?.email?.[0] ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Registration failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-canvas-from), var(--color-canvas-to))" }}>
      <div className="glass-card w-full max-w-sm p-8 rounded-2xl">
        <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text)" }}>Create account</h1>

        {error && <p className="mb-4 text-sm text-red-500" role="alert" aria-live="polite">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: "Name",             type: "text",     value: name,     onChange: setName,     autocomplete: "name" },
            { label: "Email",            type: "email",    value: email,    onChange: setEmail,    autocomplete: "email" },
            { label: "Password",         type: "password", value: password, onChange: setPassword, autocomplete: "new-password" },
            { label: "Confirm password", type: "password", value: confirm,  onChange: setConfirm,  autocomplete: "new-password" },
          ].map(({ label, type, value, onChange, autocomplete }) => (
            <div key={label}>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                autoComplete={autocomplete}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus-visible:ring-2"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-sm font-semibold cursor-pointer transition-opacity disabled:opacity-60"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
          Have an account?{" "}
          <a href="/auth/login" className="underline" style={{ color: "var(--color-primary)" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
