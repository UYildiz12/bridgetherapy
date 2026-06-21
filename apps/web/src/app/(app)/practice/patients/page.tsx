"use client";
import { useEffect, useState } from "react";
import { fetchPatients, addPatient, type LinkedPatient } from "@/lib/homework/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";

export default function PatientsPage() {
  const [patients, setPatients] = useState<LinkedPatient[] | null>(null);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients()
      .then(setPatients)
      .catch(() => setError("Couldn't load your patients."));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      const p = await addPatient(email.trim());
      setPatients((prev) => (prev ?? []).filter((x) => x.patientId !== p.patientId));
      setNotice(`Invitation sent to ${p.name}. They'll appear here after they accept.`);
      setEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that patient.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Patients</h1>
        <p className="text-sm text-muted-foreground">
          Invite a patient by the email they signed up with.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="email">Patient email</Label>
              <Input
                id="email"
                type="email"
                placeholder="patient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={adding || !email.trim()}>
              {adding ? "Inviting..." : "Invite patient"}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {notice && <p className="mt-3 text-sm text-emerald-400">{notice}</p>}
        </CardContent>
      </Card>

      {patients === null && !error && <Skeleton className="h-24 w-full rounded-xl" />}
      {patients && patients.length === 0 && (
        <EmptyState
          icon={<Users size={18} strokeWidth={1.75} />}
          title="No patients yet"
          hint="Invite your first patient with their email above."
        />
      )}
      {patients && patients.length > 0 && (
        <div className="grid gap-2">
          {patients.map((p) => (
            <Card key={p.patientId}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.email}</div>
                </div>
                <span className="text-xs text-muted-foreground">
                  since {new Date(p.linkedAt).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
