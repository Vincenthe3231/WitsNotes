"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { RegisterSchema } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setLoading(true);

    // Client-side validation
    const validation = RegisterSchema.safeParse({
      name,
      email,
      password,
      password_confirmation: confirm,
    });
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setErrors(fieldErrors as Record<string, string[]>);
      setLoading(false);
      return;
    }

    try {
      const user = await register(validation.data);
      setUser(user);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details) {
        // Map server validation errors
        setErrors(err.details as Record<string, string[]>);
      } else {
        setGeneralError("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { name: "name", label: "Name", type: "text", value: name, onChange: setName, autocomplete: "name" },
    { name: "email", label: "Email", type: "email", value: email, onChange: setEmail, autocomplete: "email" },
    { name: "password", label: "Password", type: "password", value: password, onChange: setPassword, autocomplete: "new-password" },
    { name: "password_confirmation", label: "Confirm password", type: "password", value: confirm, onChange: setConfirm, autocomplete: "new-password" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-canvas-from), var(--color-canvas-to))" }}>
      <div className="glass-card w-full max-w-sm p-8 rounded-2xl">
        <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text)" }}>Create account</h1>

        {generalError && <p className="mb-4 text-sm text-red-500" role="alert" aria-live="polite">{generalError}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map(({ name, label, type, value, onChange, autocomplete }) => (
            <div key={name}>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                autoComplete={autocomplete}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus-visible:ring-2"
                style={{
                  background: "var(--color-surface)",
                  borderColor: errors[name] ? "#ef4444" : "var(--color-border)",
                  color: "var(--color-text)",
                }}
                aria-invalid={!!errors[name]}
                aria-describedby={errors[name] ? `${name}-error` : undefined}
              />
              {errors[name] && (
                <p id={`${name}-error`} className="mt-1 text-xs text-red-500">
                  {errors[name][0]}
                </p>
              )}
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
