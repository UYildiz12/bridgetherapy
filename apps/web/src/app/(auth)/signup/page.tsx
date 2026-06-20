"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { provisionUser } from "@/lib/provision-client";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", role: "PATIENT" as "PATIENT" | "THERAPIST" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: signErr } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (signErr) { setError(signErr.message); setLoading(false); return; }
    const token = data.session?.access_token;
    if (!token) { setError("Check your email to confirm, then log in."); setLoading(false); return; }
    try {
      await provisionUser(token, { firstName: form.firstName, lastName: form.lastName, role: form.role });
      router.refresh(); // ensure server components see the new session before navigating
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 360, margin: "4rem auto", display: "grid", gap: 12 }}>
      <h1>Create your account</h1>
      <input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
      <input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
      <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "PATIENT" | "THERAPIST" })}>
        <option value="PATIENT">Patient</option>
        <option value="THERAPIST">Therapist</option>
      </select>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <button disabled={loading} type="submit">{loading ? "Creating…" : "Sign up"}</button>
    </form>
  );
}
