-- Relationship initiator: distinguishes a patient-opened request (waits on the
-- therapist) from a therapist-opened invite (waits on the patient), so a
-- therapist can no longer self-accept an invite they created.
CREATE TYPE "RequestInitiator" AS ENUM ('PATIENT', 'THERAPIST');

ALTER TABLE "PatientTherapist"
  ADD COLUMN "initiatedBy" "RequestInitiator" NOT NULL DEFAULT 'PATIENT';

-- Backfill existing therapist-created invites (identified by the note the invite
-- route writes) so they aren't mistaken for patient requests.
UPDATE "PatientTherapist"
  SET "initiatedBy" = 'THERAPIST'
  WHERE "requestNote" = 'Therapist invited patient by email.';

-- Notification preferences, honored by the reminder cron.
ALTER TABLE "User"
  ADD COLUMN "notifySessionReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyHomeworkNudges"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyWeeklyCheckin"    BOOLEAN NOT NULL DEFAULT true;

-- Indexes for hot filter/sort paths that were doing sequential scans.
CREATE INDEX "Homework_createdById_idx" ON "Homework"("createdById");
CREATE INDEX "MoodEntry_patientId_createdAt_idx" ON "MoodEntry"("patientId", "createdAt");
CREATE INDEX "PatientNote_patientId_createdAt_idx" ON "PatientNote"("patientId", "createdAt");
CREATE INDEX "PatientNote_visibility_sharedAt_idx" ON "PatientNote"("visibility", "sharedAt");
CREATE INDEX "TherapistProfile_approvedAt_acceptingPatients_idx" ON "TherapistProfile"("approvedAt", "acceptingPatients");
