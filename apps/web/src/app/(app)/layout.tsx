import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@exhale/db";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { firstName: true, role: true },
  });
  if (!user) redirect("/signup");

  return (
    <AppShell firstName={user.firstName} role={user.role}>
      {children}
    </AppShell>
  );
}
