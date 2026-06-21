"use client";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchTherapistNotes,
  updateTherapistNote,
  type TherapistNote,
} from "@/lib/notes-client";

export default function TherapistNotesPage() {
  const [notes, setNotes] = useState<TherapistNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTherapistNotes()
      .then(setNotes)
      .catch(() => setError("Couldn't load patient notes."));
  }, []);

  async function toggle(note: TherapistNote) {
    setUpdatingId(note.id);
    setError(null);
    try {
      const updated = await updateTherapistNote(note.id, !note.isResolved);
      setNotes((prev) =>
        (prev ?? []).map((n) => (n.id === note.id ? { ...n, isResolved: updated.isResolved } : n)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that note.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Patient notes</h1>
        <p className="text-sm text-muted-foreground">
          Questions and moments patients want you to review.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {notes === null && !error && <Skeleton className="h-24 w-full rounded-xl" />}
      {notes && notes.length === 0 && (
        <EmptyState title="No patient notes" hint="Open questions from active patients will appear here." />
      )}
      {notes && notes.length > 0 && (
        <div className="grid gap-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                  <span>{note.patientName}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm text-muted-foreground">{note.content}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {note.isResolved ? "Resolved" : "Open"} - {note.patientEmail}
                  </span>
                  <Button
                    type="button"
                    variant={note.isResolved ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggle(note)}
                    disabled={updatingId === note.id}
                  >
                    {note.isResolved ? "Reopen" : "Resolve"}
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
