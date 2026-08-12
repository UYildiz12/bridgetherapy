-- Journal & Reflections (Lumen workspace):
-- Evolve PatientNote from a resolvable "question for therapist" into a
-- private-by-default journal entry that can be shared with the therapist and
-- discussed with Lumen (the AI companion).

CREATE TYPE "NoteVisibility" AS ENUM ('PRIVATE', 'SHARED');
CREATE TYPE "LumenRole" AS ENUM ('USER', 'LUMEN');

ALTER TABLE "PatientNote"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "visibility" "NoteVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "sharedAt" TIMESTAMP(3);

-- Existing notes were therapist-facing questions; preserve that visibility.
UPDATE "PatientNote" SET "visibility" = 'SHARED', "sharedAt" = "createdAt";

ALTER TABLE "PatientNote" DROP COLUMN "isResolved";

CREATE TABLE "LumenMessage" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "role" "LumenRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LumenMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LumenMessage_noteId_createdAt_idx" ON "LumenMessage"("noteId", "createdAt");

ALTER TABLE "LumenMessage"
  ADD CONSTRAINT "LumenMessage_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "PatientNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
