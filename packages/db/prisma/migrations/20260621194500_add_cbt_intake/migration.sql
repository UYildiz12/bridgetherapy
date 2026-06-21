-- Store structured CBT-informed onboarding responses without requiring a
-- column migration for every future prompt.
ALTER TABLE "PatientProfile" ADD COLUMN "cbtIntake" JSONB;
