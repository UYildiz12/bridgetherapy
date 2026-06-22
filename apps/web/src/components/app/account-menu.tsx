"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignOutButton } from "./sign-out-button";

export function AccountMenu({
  display,
  initials,
  email,
}: {
  display: string;
  initials: string;
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Avatar size="lg">
          <AvatarFallback className="bg-foreground/10 text-xs font-medium text-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-white/12 bg-card shadow-[0_18px_44px_-14px_rgb(0_0_0/0.6)] backdrop-blur-xl"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{display}</p>
            {email && email !== display && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>
          <div className="grid gap-0.5 p-1.5">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <Settings size={15} aria-hidden /> Settings
            </Link>
            <div className="[&>button]:w-full [&>button]:justify-start [&>button]:px-3 [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
