"use client";
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { fetchRequests, respondToRequest, type IncomingRequest } from "@/lib/matching/client";
import { concernLabel } from "@/lib/matching/taxonomy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { SubNav } from "@/components/app/sub-nav";

export default function RequestsPage() {
  const [items, setItems] = useState<IncomingRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRequests()
      .then((requests) => {
        if (!cancelled) setItems(requests);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load requests.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await respondToRequest(id, accept);
      setItems((prev) => (prev ?? []).filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Patients" sub="Patients asking to connect with you." />
      <SubNav
        links={[
          { href: "/practice/patients", label: "Patients" },
          { href: "/practice/requests", label: "Requests" },
        ]}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {items === null && !error && <Skeleton className="h-28 w-full rounded-xl" />}
      {items && items.length === 0 && (
        <EmptyState
          icon={<UserPlus size={18} strokeWidth={1.75} />}
          title="No requests right now"
          hint="When a patient requests you, they will show up here to accept or decline."
        />
      )}
      {items && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">{r.patientName}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {r.concerns.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.concerns.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {concernLabel(c)}
                      </span>
                    ))}
                  </div>
                )}
                {r.goals && <p className="text-sm text-muted-foreground">{r.goals}</p>}
                {r.requestNote && <p className="text-sm text-foreground/90">{r.requestNote}</p>}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => respond(r.id, true)} disabled={busyId === r.id}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respond(r.id, false)}
                    disabled={busyId === r.id}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
