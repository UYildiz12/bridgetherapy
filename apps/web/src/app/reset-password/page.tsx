"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Stage = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The email link carries a recovery code; the browser client exchanges it for
  // a session on load. Wait briefly for that session before showing the form.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let tries = 0;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setStage("ready");
        return;
      }
      tries += 1;
      if (tries >= 10) setStage("invalid");
      else setTimeout(check, 400);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push("/dashboard");
  }

  return (
    <div className="auth-card">
      <div className="auth-eyebrow">Reset password</div>
      <h1 className="auth-title">Set a new password</h1>

      {stage === "checking" && <p className="auth-sub">Checking your reset link…</p>}

      {stage === "invalid" && (
        <>
          <p className="auth-sub">
            This reset link has expired or was already used.
          </p>
          <p className="auth-alt">
            <Link href="/forgot-password">Request a new link</Link>
          </p>
        </>
      )}

      {stage === "ready" && (
        <>
          <p className="auth-sub">Choose something you haven&apos;t used here before.</p>
          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">New password</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p role="alert" className="auth-error">{error}</p>}

            <button className="cta-button auth-submit" type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save and continue"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
