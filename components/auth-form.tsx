"use client";

import { useState, useTransition } from "react";
import { logIn, signUp } from "@/lib/actions/auth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = mode === "login" ? logIn : signUp;
      const result = await action(formData);

      if (result && !result.success) {
        setError(result.error ?? "Something went wrong.");
      } else if (result?.success && mode === "signup") {
        setSuccess(result.data as string);
      }
      // On login success, the server action redirects — nothing to do here
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Email */}
      <div>
        <label htmlFor="email" className="label-text">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="input-field"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="label-text">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
          className="input-field"
        />
        {mode === "signup" && (
          <p className="mt-1.5 text-xs font-sans text-ink-muted">
            Minimum 6 characters.
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-error text-sm font-sans">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-success text-sm font-sans">
          <span className="mt-0.5 shrink-0">✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full py-3.5 text-base"
      >
        {isPending
          ? mode === "login"
            ? "Logging in…"
            : "Creating account…"
          : mode === "login"
          ? "Log in"
          : "Create account"}
      </button>
    </form>
  );
}
