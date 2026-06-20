import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@exhale/db";

export default async function AppHome() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: data.user.id } });
  if (!user) redirect("/signup");

  return (
    <main style={{ maxWidth: 640, margin: "4rem auto" }}>
      <h1>Welcome, {user.firstName}</h1>
      <p>You are signed in as a {user.role.toLowerCase()}.</p>
    </main>
  );
}
