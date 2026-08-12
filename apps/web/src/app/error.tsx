"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in devtools / logging without exposing it in the UI.
    console.error(error);
  }, [error]);

  return (
    <div className="landing-page" data-theme="dark">
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Something broke</p>
        <h1
          className="mt-4 text-4xl text-white sm:text-5xl"
          style={{ fontFamily: "var(--font-instrument-serif), serif" }}
        >
          That wasn&apos;t supposed to happen.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/60">
          An unexpected error interrupted the page. Your data is safe. Try again, and if it
          keeps happening, sign out and back in.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={reset} className="cta-button">
            Try again
          </button>
          <Link
            href="/dashboard"
            className="text-sm text-white/60 underline underline-offset-4 transition-colors hover:text-white"
          >
            Back to the app
          </Link>
        </div>
      </main>
    </div>
  );
}
