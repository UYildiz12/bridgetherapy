CREATE TABLE "SessionWorkspace" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "whiteboard" JSONB,
    "patientNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionWorkspace_sessionId_key" ON "SessionWorkspace"("sessionId");
CREATE INDEX "SessionWorkspace_updatedAt_idx" ON "SessionWorkspace"("updatedAt");

ALTER TABLE "SessionWorkspace" ADD CONSTRAINT "SessionWorkspace_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
