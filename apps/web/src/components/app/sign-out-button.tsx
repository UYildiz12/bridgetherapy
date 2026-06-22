"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  className,
  menuItem = false,
  onSignedOut,
}: {
  className?: string;
  menuItem?: boolean;
  onSignedOut?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut();
    if (signOutError) {
      setError("Couldn't sign out. Try again.");
      setPending(false);
      return;
    }
    onSignedOut?.();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        role={menuItem ? "menuitem" : undefined}
        variant="ghost"
        size="sm"
        onClick={signOut}
        disabled={pending}
        className={className}
      >
        {pending ? "Signing out..." : "Sign out"}
      </Button>
      {error && <p role="alert" className="px-3 pb-2 text-xs text-destructive">{error}</p>}
    </>
  );
}
