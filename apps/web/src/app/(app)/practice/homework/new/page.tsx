"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HomeworkItem, ItemKind } from "@/lib/homework/schema";
import { ITEM_KINDS, ITEM_KIND_LABELS } from "@/lib/homework/schema";
import { createSet } from "@/lib/homework/client";
import { ItemEditor } from "@/components/homework/item-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function newItem(kind: ItemKind): HomeworkItem {
  const id = crypto.randomUUID();
  switch (kind) {
    case "task":
      return { id, kind, title: "" };
    case "reading":
      return { id, kind, title: "", body: "" };
    case "writing":
      return { id, kind, title: "" };
    case "quiz":
      return { id, kind, title: "", question: "", choices: ["", ""], answerIndex: 0 };
    case "voice":
      return { id, kind, title: "" };
    case "drawing":
      return { id, kind, title: "" };
  }
}

export default function NewSetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (kind: ItemKind) => setItems((prev) => [...prev, newItem(kind)]);
  const updateItem = (i: number, it: HomeworkItem) =>
    setItems((prev) => prev.map((x, j) => (j === i ? it : x)));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, j) => j !== i));
  const moveItem = (i: number, dir: -1 | 1) =>
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setError(null);
    if (!title.trim()) return setError("Give the set a title.");
    if (items.length === 0) return setError("Add at least one item.");
    if (items.some((it) => !it.title.trim())) return setError("Every item needs a title.");
    setSaving(true);
    try {
      await createSet({
        title: title.trim(),
        description: description.trim() || undefined,
        content: { items },
      });
      router.push("/practice/homework");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the set.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/practice/homework" className="text-sm text-muted-foreground hover:text-foreground">
          ← Homework sets
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New homework set</h1>
        <p className="text-sm text-muted-foreground">Compose a set of items. A set can mix any kinds.</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cognitive restructuring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Description (optional)</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note for the patient"
            />
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="grid gap-3">
          {items.map((it, i) => (
            <ItemEditor
              key={it.id}
              item={it}
              index={i}
              count={items.length}
              onChange={(x) => updateItem(i, x)}
              onRemove={() => removeItem(i)}
              onMove={(d) => moveItem(i, d)}
            />
          ))}
        </div>
      )}

      <div className="grid gap-2">
        <Label>Add an item</Label>
        <div className="flex flex-wrap gap-2">
          {ITEM_KINDS.map((k) => (
            <Button key={k} type="button" variant="outline" size="sm" onClick={() => add(k)}>
              + {ITEM_KIND_LABELS[k]}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save set"}
        </Button>
      </div>
    </div>
  );
}
