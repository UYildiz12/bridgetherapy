"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";
import { AccountMenu } from "./account-menu";

const NAV: Record<
  "PATIENT" | "THERAPIST",
  { href: string; label: string; also?: string[] }[]
> = {
  PATIENT: [
    { href: "/dashboard", label: "Home" },
    { href: "/mood", label: "Mood" },
    { href: "/notes", label: "Reflections" },
    { href: "/messages", label: "Messages" },
    { href: "/sessions", label: "Sessions" },
    { href: "/wellness", label: "Wellness" },
    { href: "/homework", label: "Homework" },
    { href: "/reports", label: "Reports" },
    { href: "/find", label: "Therapist" },
  ],
  // Requests lives under Patients, and Assignments under Homework, as page tabs.
  THERAPIST: [
    { href: "/dashboard", label: "Home" },
    { href: "/practice/patients", label: "Patients", also: ["/practice/requests"] },
    { href: "/practice/sessions", label: "Sessions" },
    { href: "/messages", label: "Messages" },
    { href: "/practice/homework", label: "Homework", also: ["/practice/assignments"] },
    { href: "/practice/notes", label: "Reflections" },
    { href: "/practice/protocols", label: "Protocols" },
    { href: "/wellness", label: "Wellness" },
    { href: "/reports", label: "Reports" },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  const display = name || email || "Your account";
  const initials = (
    name ? name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("") : email?.[0] ?? "?"
  ).toUpperCase();
  const links = NAV[role === "THERAPIST" ? "THERAPIST" : "PATIENT"];

  const renderLinks = (variant: "desktop" | "mobile") =>
    links.map((l) => {
      const active =
        l.href === "/dashboard"
          ? pathname === l.href
          : pathname.startsWith(l.href) || (l.also?.some((p) => pathname.startsWith(p)) ?? false);
      return (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active ? "page" : undefined}
          onClick={() => variant === "mobile" && setMobileOpen(false)}
          className={`whitespace-nowrap rounded-md text-sm transition-colors ${
            variant === "desktop"
              ? "shrink-0 px-3 py-2"
              : "block px-3 py-3 text-base"
          } ${
            active
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/55 hover:text-foreground"
          }`}
        >
          {l.label}
        </Link>
      );
    });

  return (
    <div className="app-shell dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
              exhale
            </Link>
            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-1 overflow-x-auto rounded-lg border border-border/70 bg-foreground/[0.025] p-1 lg:flex [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {renderLinks("desktop")}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Always-visible, quiet route to crisis resources from any page. */}
            <Link
              href="/wellness?tab=crisis"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/55 hover:text-foreground"
            >
              <LifeBuoy className="size-4" aria-hidden="true" />
              Crisis support
            </Link>
            <div className="hidden lg:block">
              <AccountMenu display={display} initials={initials} email={email} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="lg:hidden"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-app-navigation"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <nav id="mobile-app-navigation" aria-label="Mobile navigation" className="border-t border-border lg:hidden">
            <div className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:px-6">
              {renderLinks("mobile")}
              <div className="mt-2 grid gap-1 border-t border-border pt-3">
                <Link
                  href="/wellness?tab=crisis"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-3 text-base text-muted-foreground transition-colors hover:bg-accent/55 hover:text-foreground"
                >
                  <LifeBuoy className="size-4" aria-hidden="true" />
                  Crisis support
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  aria-current={pathname.startsWith("/settings") ? "page" : undefined}
                  className={`block rounded-md px-3 py-3 text-base transition-colors ${
                    pathname.startsWith("/settings")
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/55 hover:text-foreground"
                  }`}
                >
                  Settings
                </Link>
                <div className="flex items-center justify-between gap-3 px-3 pt-1">
                  <span className="min-w-0 truncate text-sm text-muted-foreground">{display}</span>
                  <SignOutButton />
                </div>
              </div>
            </div>
          </nav>
        )}
      </header>
      <main key={pathname} className="app-rise mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
