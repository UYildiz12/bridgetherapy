"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus("idle");

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setStatus("error");
      setLoading(false);
      return;
    }

    setStatus("sent");
    setLoading(false);
  }

  return (
    <div className="auth-card">
      <div className="auth-eyebrow">Account recovery</div>
      <h1 className="auth-title">Reset your password</h1>
      <p className="auth-sub">We&apos;ll send a secure link to your email so you can choose a new password.</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && <p role="alert" className="auth-error">{error}</p>}
        {status === "sent" && (
          <p role="status" className="auth-note">
            Check your inbox for the reset link, then return here to set a new password.
          </p>
        )}

        <button className="cta-button auth-submit" type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="auth-alt">
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
