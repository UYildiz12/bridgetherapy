"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { provisionUser } from "@/lib/provision-client";

type Role = "PATIENT" | "THERAPIST";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole: Role = params.get("role") === "therapist" ? "THERAPIST" : "PATIENT";

  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: initialRole,
  });
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNote(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: signErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }
    const token = data.session?.access_token;
    if (!token) {
      setNote("Almost there — check your email to confirm, then log in.");
      setLoading(false);
      return;
    }
    try {
      await provisionUser(token, {
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
      });
      router.refresh(); // ensure server components see the new session before navigating
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-eyebrow">Get started</div>
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-sub">A calmer, clearer space for the work ahead.</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-field">
          <span className="auth-label">I am a</span>
          <div className="auth-segment" role="group" aria-label="Account type">
            <button
              type="button"
              className={form.role === "PATIENT" ? "active" : ""}
              aria-pressed={form.role === "PATIENT"}
              onClick={() => setForm({ ...form, role: "PATIENT" })}
            >
              Patient
            </button>
            <button
              type="button"
              className={form.role === "THERAPIST" ? "active" : ""}
              aria-pressed={form.role === "THERAPIST"}
              onClick={() => setForm({ ...form, role: "THERAPIST" })}
            >
              Therapist
            </button>
          </div>
        </div>

        <div className="auth-row">
          <div className="auth-field">
            <label className="auth-label" htmlFor="firstName">First name</label>
            <input
              id="firstName"
              className="auth-input"
              autoComplete="given-name"
              placeholder="Jordan"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              className="auth-input"
              autoComplete="family-name"
              placeholder="Rivera"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        {error && <p className="auth-error">{error}</p>}
        {note && <p className="auth-note">{note}</p>}

        <button className="cta-button auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="auth-alt">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
