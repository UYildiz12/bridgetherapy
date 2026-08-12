-- Allow fractional mood scores (e.g. 8.6) from the continuous mood slider.
-- Widening Int -> double precision is lossless; existing integer values are preserved.
ALTER TABLE "MoodEntry" ALTER COLUMN "moodScore" SET DATA TYPE DOUBLE PRECISION;
