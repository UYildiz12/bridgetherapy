import { redirect } from "next/navigation";
import { prisma } from "@exhale/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProvisioned } from "@/lib/provision";
import { AppShell } from "@/components/app/app-shell";
import { TherapistPending } from "@/components/app/therapist-pending";

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

  // Therapists self-register but stay pending until an admin approves them.
  // Gate the entire authenticated area here so no (app) route renders for an
  // unapproved therapist. (API access is independently enforced by
  // requireApprovedTherapist; admins approve via `pnpm --filter web db:approve`.)
  if (user.role === "THERAPIST") {
    const profile = await prisma.therapistProfile.findUnique({
      where: { userId: user.id },
      select: { approvedAt: true },
    });
    if (!profile?.approvedAt) {
      return (
        <AppShell firstName={user.firstName} role={user.role}>
          <TherapistPending firstName={user.firstName} />
        </AppShell>
      );
    }
  }

  return (
    <AppShell firstName={user.firstName} role={user.role}>
      {children}
    </AppShell>
  );
}
