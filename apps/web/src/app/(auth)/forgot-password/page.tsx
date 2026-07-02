"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="auth-card">
      <div className="auth-eyebrow">Reset password</div>
      <h1 className="auth-title">Forgot your password?</h1>
      <p className="auth-sub">
        Enter your email and we&apos;ll send you a link to set a new one.
      </p>

      {sent ? (
        <p role="status" className="auth-note">
          Check your inbox. If an account exists for {email}, a reset link is on its way.
          It can take a minute to arrive.
        </p>
      ) : (
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

          <button className="cta-button auth-submit" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="auth-alt">
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
