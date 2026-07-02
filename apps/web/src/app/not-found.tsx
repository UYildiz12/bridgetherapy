import Link from "next/link";
import { BlueprintSvg } from "@/components/landing/blueprint-svg";

export default function NotFound() {
  return (
    <div className="landing-page" data-theme="dark">
      <BlueprintSvg />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">404</p>
        <h1
          className="mt-4 text-4xl text-white sm:text-5xl"
          style={{ fontFamily: "var(--font-instrument-serif), serif" }}
        >
          There&apos;s nothing at this address.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/60">
          The page may have moved, or the link was mistyped. Either way, nothing is lost.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard" className="cta-button no-underline">
            Open the app
          </Link>
          <Link
            href="/"
            className="text-sm text-white/60 underline underline-offset-4 transition-colors hover:text-white"
          >
            Go to the home page
          </Link>
        </div>
      </main>
    </div>
  );
}
