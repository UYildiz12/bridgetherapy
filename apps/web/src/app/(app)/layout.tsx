import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProvisioned } from "@/lib/provision";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  // Self-healing: create the app User row from the session if it's missing,
  // rather than bouncing to /signup (which loops for confirmed-but-unprovisioned users).
  const user = await ensureProvisioned(data.user);

  return (
    <AppShell firstName={user.firstName} role={user.role}>
      {children}
    </AppShell>
  );
}
