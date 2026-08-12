"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, WandSparkles } from "lucide-react";
import { docSchema, type BlockResponse, type HomeworkDoc } from "@/lib/homework/blocks";
import { parseDoc } from "@/lib/homework/adapt";
import { PRESETS } from "@/lib/homework/presets";
import { createSet, draftSetWithAI, fetchSet, updateSet } from "@/lib/homework/client";
import { BlockEditor } from "@/components/homework/block-editor";
import { BlockView } from "@/components/homework/block-view";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const EMPTY_DOC: HomeworkDoc = { version: 2, schedule: { cadence: "once" }, blocks: [] };

function SetBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("edit");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [doc, setDoc] = useState<HomeworkDoc>(EMPTY_DOC);
  const [loadingSet, setLoadingSet] = useState(Boolean(editId));
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Scratch responses so the live preview is actually interactive.
  const [previewResponses, setPreviewResponses] = useState<Record<string, BlockResponse>>({});

  useEffect(() => {
    if (!editId) return;
    fetchSet(editId)
      .then((s) => {
        setTitle(s.title);
        setDescription(s.description ?? "");
        setDoc(parseDoc(s.content));
      })
      .catch(() => setError("Couldn't load this set."))
      .finally(() => setLoadingSet(false));
  }, [editId]);

  function loadPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setTitle(preset.title);
    setDescription(preset.description);
    // Deep copy so edits never mutate the shipped preset.
    setDoc(JSON.parse(JSON.stringify(preset.doc)) as HomeworkDoc);
    setPreviewResponses({});
    setDraftNotice(null);
  }

  async function draftWithAI() {
    setError(null);
    setDraftNotice(null);
    if (draftPrompt.trim().length < 12) return setError("Describe the homework you want to draft.");
    setDrafting(true);
    try {
      const draft = await draftSetWithAI({
        prompt: draftPrompt.trim(),
        patientContext: description.trim() || undefined,
      });
      setTitle(draft.title);
      setDescription(draft.description ?? "");
      setDoc(parseDoc(draft.content));
      setPreviewResponses({});
      setDraftNotice(draft.guidance ?? "Therapist review required before assigning this set.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't draft the set.");
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    setError(null);
    if (!title.trim()) return setError("Give the set a title.");
    const valid = docSchema.safeParse(doc);
    if (!valid.success) {
      const issue = valid.error.issues[0];
      return setError(
        doc.blocks.length === 0
          ? "Add at least one block."
          : `Check the blocks: ${issue.message.toLowerCase()}.`,
      );
    }
    setSaving(true);
    try {
      if (editId) {
        await updateSet(editId, { title: title.trim(), description: description.trim() || undefined, content: valid.data });
      } else {
        await createSet({ title: title.trim(), description: description.trim() || undefined, content: valid.data });
      }
      router.push("/practice/homework");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the set.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingSet) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/practice/homework" className="text-sm text-muted-foreground hover:text-foreground">
          ← Homework sets
        </Link>
        <h1 className="mt-2 text-2xl">{editId ? "Edit homework set" : "New homework set"}</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Compose anything from a one-line task to a full worksheet: instructions, questions,
          scales, logs, recordings, and real app activities.
        </p>
      </div>

      {!editId && (
        <div className="grid gap-2">
          <Label>Start from a preset</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => loadPreset(p.id)}
                title={p.description}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="grid gap-4 border-y border-border py-5">
        <div className="grid gap-2">
          <Label htmlFor="draft-brief">Draft brief</Label>
          <textarea
            id="draft-brief"
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Example: a week-long sleep diary with a morning rested rating and an evening worry sort."
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={draftWithAI} disabled={drafting}>
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
            {drafting ? "Drafting..." : "Draft with AI"}
          </Button>
          {draftNotice && <p className="text-sm text-muted-foreground">{draftNotice}</p>}
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="grid gap-4">
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thought record" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description (optional)</Label>
                <Input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short note the patient sees"
                />
              </div>
            </CardContent>
          </Card>

          <BlockEditor value={doc} onChange={setDoc} />

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editId ? "Save changes" : "Save set"}
            </Button>
          </div>
        </div>

        <aside className="top-24 hidden gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 xl:sticky xl:grid">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Eye size={13} aria-hidden /> Patient preview
          </p>
          {doc.blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Blocks you add appear here exactly as the patient sees them.</p>
          ) : (
            <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
              {doc.blocks.map((block) => (
                <BlockView
                  key={block.id}
                  block={block}
                  response={previewResponses[block.id]}
                  onChange={(r) => setPreviewResponses((prev) => ({ ...prev, [block.id]: { ...prev[block.id], ...r } }))}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function NewSetPage() {
  return (
    <Suspense fallback={null}>
      <SetBuilder />
    </Suspense>
  );
}
