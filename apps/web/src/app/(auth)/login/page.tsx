"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("auth-theme") === "dark",
  );

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("auth-theme", next ? "dark" : "light");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/dashboard");
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleTheme}
        className={`fixed top-8 right-8 p-2 rounded-lg transition-colors ${
          isDark ? "bg-blue-900 hover:bg-blue-800 text-yellow-300" : "bg-white text-blue-600 shadow-md hover:bg-blue-50"
        }`}
        aria-label="Toggle theme"
      >
        {isDark ? "☀" : "☾"}
      </button>

      <div className="auth-card">
        <div className="auth-brand">Exhale</div>
        <div className="auth-eyebrow">Welcome back</div>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Continue to your care plan and progress journal.</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <div className="auth-alt" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        {error && <p role="alert" className="auth-error">{error}</p>}

        <button className="cta-button auth-submit" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

        <p className="auth-alt">
          Need an account? <Link href="/signup">Create one</Link>
        </p>
      </div>
    </>
  );
}

