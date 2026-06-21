import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export function AppShell({
  firstName,
  role,
  children,
}: {
  firstName: string;
  role: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            exhale
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {firstName} · {role.toLowerCase()}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
