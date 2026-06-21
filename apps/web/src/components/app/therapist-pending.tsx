import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shown in place of the app to a THERAPIST whose account has not yet been
 * approved by an admin. Presentational only — the gating decision lives in the
 * (app) layout, and API access is enforced by requireApprovedTherapist.
 */
export function TherapistPending({ firstName }: { firstName: string }) {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Thanks, {firstName} — your therapist account is under review</CardTitle>
          <CardDescription>
            Our team verifies every therapist before granting access to patient features.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You can stay signed in — we&apos;ll unlock the full therapist workspace as soon as your
          account is approved. This usually doesn&apos;t take long.
        </CardContent>
      </Card>
    </div>
  );
}
