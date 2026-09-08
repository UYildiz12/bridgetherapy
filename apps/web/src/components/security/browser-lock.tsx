"use client";
import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOCK_KEY = "bridge.security.browserLockEnabled";

type Availability = "unchecked" | "checking" | "available" | "unavailable";

function storedLockEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LOCK_KEY) === "true";
}

async function hasPlatformAuthenticator() {
  if (typeof window === "undefined" || !("PublicKeyCredential" in window)) return false;
  const credential = window.PublicKeyCredential as typeof PublicKeyCredential & {
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  };
  if (typeof credential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") return false;
  return credential.isUserVerifyingPlatformAuthenticatorAvailable();
}

export function BrowserLock() {
  const [availability, setAvailability] = useState<Availability>("unchecked");
  const [enabled, setEnabled] = useState(storedLockEnabled);

  async function checkDevice() {
    setAvailability("checking");
    setAvailability((await hasPlatformAuthenticator()) ? "available" : "unavailable");
  }

  function updateEnabled(value: boolean) {
    setEnabled(value);
    window.localStorage.setItem(LOCK_KEY, String(value));
  }

  return (
    <div className="grid gap-3 border-t border-border pt-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Fingerprint className="h-4 w-4" aria-hidden="true" />
        Browser lock
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Checks whether this device exposes passkey or biometric verification and stores a local lock preference for this browser.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={checkDevice} disabled={availability === "checking"}>
          {availability === "checking" ? "Checking..." : "Check this device"}
        </Button>
        {availability === "available" && (
          <Button type="button" variant={enabled ? "outline" : "default"} size="sm" onClick={() => updateEnabled(!enabled)}>
            {enabled ? "Disable browser lock" : "Enable browser lock"}
          </Button>
        )}
      </div>
      {availability === "available" && (
        <p className="text-sm text-muted-foreground">Passkey or biometric verification is available on this device.</p>
      )}
      {availability === "unavailable" && (
        <p className="text-sm text-muted-foreground">This browser did not report a user-verifying passkey or biometric authenticator.</p>
      )}
    </div>
  );
}
