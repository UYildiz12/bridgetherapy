"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignOutButton } from "./sign-out-button";

const NAV: Record<"PATIENT" | "THERAPIST", { href: string; label: string }[]> = {
  PATIENT: [
    { href: "/dashboard", label: "Home" },
    { href: "/mood", label: "Mood" },
    { href: "/homework", label: "Homework" },
    { href: "/find", label: "Therapist" },
  ],
  THERAPIST: [
    { href: "/dashboard", label: "Home" },
    { href: "/practice/patients", label: "Patients" },
    { href: "/practice/requests", label: "Requests" },
    { href: "/practice/homework", label: "Sets" },
    { href: "/practice/assignments", label: "Assignments" },
  ],
};

export function AppShell({
  firstName,
  lastName,
  email,
  role,
  children,
}: {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  const display = name || email || "Your account";
  const initials = (
    name ? name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("") : email?.[0] ?? "?"
  ).toUpperCase();
  const links = NAV[role === "THERAPIST" ? "THERAPIST" : "PATIENT"];

  return (
    <div className="app-shell dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              exhale
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {links.map((l) => {
                const active =
                  l.href === "/dashboard" ? pathname === l.href : pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2.5">
              <Avatar>
                <AvatarFallback className="bg-foreground/10 text-xs font-medium text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm text-muted-foreground sm:inline">{display}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main key={pathname} className="app-rise mx-auto max-w-5xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
