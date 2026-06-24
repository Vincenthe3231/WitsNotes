"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { LoginSchema } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setLoading(true);

    // Client-side validation
    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setErrors(fieldErrors as Record<string, string[]>);
      setLoading(false);
      return;
    }

    try {
      const user = await login(validation.data);
      setUser(user);
      const from = searchParams.get("from") ?? "/";
      router.replace(from);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details) {
        // Map server validation errors
        setErrors(err.details as Record<string, string[]>);
      } else {
        setGeneralError("Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card w-full max-w-sm p-8 rounded-2xl">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text)" }}>Sign in to WitsNote</h1>

      {generalError && (
        <p className="mb-4 text-sm text-red-500" role="alert" aria-live="polite">{generalError}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus-visible:ring-2"
            style={{
              background: "var(--color-surface)",
              borderColor: errors.email ? "#ef4444" : "var(--color-border)",
              color: "var(--color-text)",
            }}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-xs text-red-500">
              {errors.email[0]}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus-visible:ring-2"
            style={{
              background: "var(--color-surface)",
              borderColor: errors.password ? "#ef4444" : "var(--color-border)",
              color: "var(--color-text)",
            }}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p id="password-error" className="mt-1 text-xs text-red-500">
              {errors.password[0]}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg text-sm font-semibold cursor-pointer transition-opacity disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
        No account?{" "}
        <a href="/auth/register" className="underline" style={{ color: "var(--color-primary)" }}>Register</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-canvas-from), var(--color-canvas-to))" }}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
