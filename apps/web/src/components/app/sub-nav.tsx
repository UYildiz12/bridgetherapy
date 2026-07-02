"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Pill tabs for sibling pages that share one primary-nav entry. */
export function SubNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Section">
      {links.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm no-underline transition-colors ${
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
