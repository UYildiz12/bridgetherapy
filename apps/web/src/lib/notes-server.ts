import "server-only";

/** Shape returned by note queries that include the Lumen message count. */
export interface NoteRow {
  id: string;
  title: string | null;
  content: string;
  visibility: string;
  sharedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { lumenMessages: number };
}

/** Serialize a journal entry for the patient's own workspace. */
export function serializeNote(n: NoteRow) {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    visibility: n.visibility,
    sharedAt: n.sharedAt,
    lumenCount: n._count.lumenMessages,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}
