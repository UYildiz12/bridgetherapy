"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { createPatientNote, fetchPatientNotes, type PatientNote } from "@/lib/notes-client";

export default function PatientNotesPage() {
  const [notes, setNotes] = useState<PatientNote[] | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientNotes()
      .then(setNotes)
      .catch(() => setError("Couldn't load your notes."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const note = await createPatientNote(content);
      setNotes((prev) => [note, ...(prev ?? [])]);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Notes for your therapist</h1>
        <p className="text-sm text-muted-foreground">
          Capture questions or moments you want to bring into session.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="grid gap-3">
            <Label htmlFor="note">New note</Label>
            <textarea
              id="note"
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What should your therapist know?"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Button type="submit" disabled={saving || !content.trim()}>
                {saving ? "Saving..." : "Save note"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {notes === null && !error && <Skeleton className="h-24 w-full rounded-xl" />}
      {notes && notes.length === 0 && (
        <EmptyState title="No notes yet" hint="Add a question or thought above." />
      )}
      {notes && notes.length > 0 && (
        <div className="grid gap-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>{note.isResolved ? "Resolved" : "Open"}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
