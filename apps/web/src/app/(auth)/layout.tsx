import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthChrome } from "@/components/auth/auth-chrome";
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

  return <AuthChrome>{children}</AuthChrome>;
}
