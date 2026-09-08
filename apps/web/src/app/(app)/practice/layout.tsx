import { redirect } from "next/navigation";
import { prisma } from "@bridge/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Therapist-only area. The (app) layout already provisions the user and gates
 * unapproved therapists; this just keeps patients out of the practice routes.
 */
export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { role: true },
  });
  if (user?.role !== "THERAPIST") redirect("/dashboard");

  return <>{children}</>;
}
