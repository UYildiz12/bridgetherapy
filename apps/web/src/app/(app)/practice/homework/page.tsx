"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchSets,
  fetchPatients,
  assignSet,
  type HomeworkSet,
  type LinkedPatient,
} from "@/lib/homework/client";
import { parseDoc } from "@/lib/homework/adapt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPlus } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

const fieldCls =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default function HomeworkSetsPage() {
  const [sets, setSets] = useState<HomeworkSet[] | null>(null);
  const [patients, setPatients] = useState<LinkedPatient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetchSets()
      .then(setSets)
      .catch(() => setError("Couldn't load your sets."));
    fetchPatients()
      .then(setPatients)
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Homework sets"
        sub="Reusable sets you can assign to patients."
        action={
          <Button asChild>
            <Link href="/practice/homework/new">New set</Link>
          </Button>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {sets === null && !error && <Skeleton className="h-28 w-full rounded-xl" />}
      {sets && sets.length === 0 && (
        <EmptyState
          icon={<FolderPlus size={18} strokeWidth={1.75} />}
          title="No homework sets yet"
          hint="Build a reusable set, then assign it to a patient."
          action={
            <Button asChild size="sm">
              <Link href="/practice/homework/new">New set</Link>
            </Button>
          }
        />
      )}
      {sets && sets.length > 0 && (
        <div className="grid gap-3">
          {sets.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    {s.description && <CardDescription>{s.description}</CardDescription>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenId(openId === s.id ? null : s.id)}
                  >
                    Assign
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <span className="text-sm text-muted-foreground">
                  {(() => {
                    const n = parseDoc(s.content).blocks.length;
                    return `${n} block${n === 1 ? "" : "s"}`;
                  })()}
                </span>
                {openId === s.id && (
                  <AssignForm set={s} patients={patients} onDone={() => setOpenId(null)} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignForm({
  set,
  patients,
  onDone,
}: {
  set: HomeworkSet;
  patients: LinkedPatient[];
  onDone: () => void;
}) {
  const [patientId, setPatientId] = useState(patients[0]?.patientId ?? "");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (patients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a patient first (Patients tab) to assign this set.
      </p>
    );
  }
  if (done) return <p className="text-sm text-foreground">Assigned.</p>;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await assignSet({
        homeworkId: set.id,
        patientId,
        dueDate: due ? new Date(due).toISOString() : undefined,
      });
      setDone(true);
      window.setTimeout(onDone, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't assign.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor={`p-${set.id}`}>Patient</Label>
        <select
          id={`p-${set.id}`}
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className={fieldCls}
        >
          {patients.map((p) => (
            <option key={p.patientId} value={p.patientId} className="bg-background">
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`d-${set.id}`}>Due (optional)</Label>
        <input
          id={`d-${set.id}`}
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className={fieldCls}
        />
      </div>
      <Button onClick={submit} disabled={busy || !patientId}>
        {busy ? "Assigning…" : "Confirm"}
      </Button>
      {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
    </div>
  );
}
