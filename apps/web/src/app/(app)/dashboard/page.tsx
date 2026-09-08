import Link from "next/link";
import { prisma } from "@bridge/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";

const PATIENT_LINKS = [
  { href: "/mood", title: "Mood check-in", desc: "Log how you feel and watch the trend build over time." },
  { href: "/homework", title: "Homework", desc: "Work through the sets your therapist assigned." },
  { href: "/find", title: "Find a therapist", desc: "Browse matched therapists and request to connect." },
];

const THERAPIST_LINKS = [
  { href: "/practice/patients", title: "Patients", desc: "Connect and manage the people you work with." },
  { href: "/practice/requests", title: "Requests", desc: "Review patients asking to connect with you." },
  { href: "/practice/homework", title: "Homework sets", desc: "Build reusable sets and assign them." },
  { href: "/practice/assignments", title: "Assignments", desc: "Track progress and review submissions." },
  { href: "/practice/profile", title: "Profile", desc: "Manage how patients find you in the directory." },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user
    ? await prisma.user.findUnique({
        where: { id: data.user.id },
        select: { firstName: true, role: true },
      })
    : null;

  const firstName = user?.firstName?.trim();
  const isTherapist = user?.role === "THERAPIST";
  const links = isTherapist ? THERAPIST_LINKS : PATIENT_LINKS;

  return (
    <div className="grid gap-8">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        sub={isTherapist ? "Your practice at a glance." : "A calm space to check in with yourself."}
      />
      <nav className="grid">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center justify-between gap-6 border-b border-border py-5 no-underline transition-colors"
          >
            <div className="grid gap-1">
              <span className="text-lg font-medium transition-colors group-hover:text-foreground">
                {l.title}
              </span>
              <span className="text-sm text-muted-foreground">{l.desc}</span>
            </div>
            <span
              className="text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
              aria-hidden
            >
              →
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
