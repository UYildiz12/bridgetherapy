"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Search } from "lucide-react";
import {
  fetchTherapists,
  fetchMyConnection,
  requestConnection,
  respondToInvite,
  type TherapistCard,
  type MyConnection,
} from "@/lib/matching/client";
import { concernLabel } from "@/lib/matching/taxonomy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/app/page-header";

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function FindPage() {
  const [cards, setCards] = useState<TherapistCard[] | null>(null);
  const [conn, setConn] = useState<MyConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTherapists(), fetchMyConnection()])
      .then(([t, c]) => {
        if (cancelled) return;
        setCards(t);
        setConn(c);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load therapists.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function load() {
    const [t, c] = await Promise.all([fetchTherapists(), fetchMyConnection()]);
    setCards(t);
    setConn(c);
  }

  async function request(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await requestConnection(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the request.");
    } finally {
      setBusyId(null);
    }
  }

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await respondToInvite(id, accept);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't respond to the invite.");
    } finally {
      setBusyId(null);
    }
  }

  const hasActive = conn?.status === "active";
  const invites = conn?.invites ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Find your therapist"
        sub="Matched to your intake. Send a request to connect."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/intake">Edit intake</Link>
          </Button>
        }
      />

      {conn?.status === "active" && (
        <Card className="border-foreground/30">
          <CardContent className="pt-6 text-sm">
            You are connected with <span className="font-medium">{conn.therapistName}</span>.
          </CardContent>
        </Card>
      )}
      {conn?.status === "pending" && (
        <Card className="border-primary/30">
          <CardContent className="pt-6 text-sm">
            Your request to <span className="font-medium">{conn.therapistName}</span> is pending their reply.
          </CardContent>
        </Card>
      )}
      {invites.map((inv) => (
        <Card key={inv.id} className="border-primary/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <span>
              <span className="font-medium">{inv.therapistName}</span> invited you to connect.
            </span>
            <span className="flex gap-2">
              <Button size="sm" onClick={() => respond(inv.id, true)} disabled={busyId === inv.id || hasActive}>
                {busyId === inv.id ? "Saving…" : "Accept"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(inv.id, false)}
                disabled={busyId === inv.id}
              >
                Decline
              </Button>
            </span>
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {cards === null && !error && <Skeleton className="h-40 w-full rounded-xl" />}
      {cards && cards.length === 0 && (
        <EmptyState
          icon={<Search size={18} strokeWidth={1.75} />}
          title="No therapists available yet"
          hint="As therapists join and open their books, your matches will appear here."
        />
      )}
      {cards && cards.length > 0 && (
        <div className="grid gap-3">
          {cards.map((t) => (
            <Card key={t.therapistId}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-foreground/10 text-foreground">
                      {initials(t.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid gap-0.5">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {t.specialty && <span className="text-sm text-muted-foreground">{t.specialty}</span>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {t.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {concernLabel(s)}
                      </span>
                    ))}
                  </div>
                )}
                {t.bio && <p className="text-sm text-muted-foreground">{t.bio}</p>}
                {t.reason && (
                  <p className="flex items-start gap-1.5 text-sm text-foreground/90">
                    <Sparkles size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" />
                    {t.reason}
                  </p>
                )}
                <div>
                  {t.connection === "active" ? (
                    <span className="text-sm text-foreground">Connected</span>
                  ) : t.connection === "pending" ? (
                    <span className="text-sm text-muted-foreground">Request pending</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => request(t.therapistId)}
                      disabled={busyId === t.therapistId || hasActive}
                    >
                      {busyId === t.therapistId ? "Sending…" : "Request to connect"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
