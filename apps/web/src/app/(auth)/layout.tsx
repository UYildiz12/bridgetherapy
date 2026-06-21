import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BlueprintSvg } from "@/components/landing/blueprint-svg";
import { BlueprintSecondarySvg } from "@/components/landing/blueprint-secondary-svg";
import "./auth.css";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Already signed in? Skip auth entirely.
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  return (
    <div className="landing-page" data-theme="dark">
      <BlueprintSvg />
      <BlueprintSecondarySvg />
      <div className="auth-shell">
        <Link href="/" className="auth-logo">
          <span className="auth-logo-badge" />
          exhale
        </Link>
        {children}
      </div>
    </div>
  );
}
