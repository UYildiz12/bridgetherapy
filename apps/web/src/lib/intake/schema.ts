import { z } from "zod";

export const EMOTION_OPTIONS = [
  { id: "sadness", label: "Sadness" },
  { id: "fear", label: "Fear" },
  { id: "anger", label: "Anger" },
  { id: "shame", label: "Shame" },
  { id: "guilt", label: "Guilt" },
  { id: "numbness", label: "Numbness" },
  { id: "overwhelm", label: "Overwhelm" },
] as const;

export const BODY_SENSATION_OPTIONS = [
  { id: "tight_chest", label: "Tight chest" },
  { id: "racing_heart", label: "Racing heart" },
  { id: "short_breath", label: "Short breath" },
  { id: "muscle_tension", label: "Muscle tension" },
  { id: "stomach", label: "Stomach discomfort" },
  { id: "fatigue", label: "Fatigue" },
  { id: "restlessness", label: "Restlessness" },
] as const;

export const BEHAVIOR_OPTIONS = [
  { id: "avoidance", label: "Avoidance" },
  { id: "withdrawal", label: "Withdrawal" },
  { id: "checking", label: "Checking" },
  { id: "reassurance", label: "Reassurance seeking" },
  { id: "rumination", label: "Rumination" },
  { id: "procrastination", label: "Procrastination" },
  { id: "overworking", label: "Overworking" },
] as const;

export const THERAPIST_STYLE_OPTIONS = [
  { id: "structured", label: "Structured" },
  { id: "gentle", label: "Gentle" },
  { id: "skills", label: "Skills-focused" },
  { id: "direct", label: "Direct" },
  { id: "reflective", label: "Reflective" },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
] as const;

export const IMPACT_OPTIONS = [
  { id: "not", label: "Not difficult" },
  { id: "somewhat", label: "Somewhat difficult" },
  { id: "very", label: "Very difficult" },
  { id: "extreme", label: "Extremely difficult" },
] as const;

const EMOTION_IDS = EMOTION_OPTIONS.map((o) => o.id);
const BODY_IDS = BODY_SENSATION_OPTIONS.map((o) => o.id);
const BEHAVIOR_IDS = BEHAVIOR_OPTIONS.map((o) => o.id);
const STYLE_IDS = THERAPIST_STYLE_OPTIONS.map((o) => o.id);

const DEFAULT_SCREENING = {
  lowMood: 0,
  worry: 0,
  panic: 0,
  sleep: 0,
  avoidance: 0,
  concentration: 0,
  functionalImpact: "not" as const,
};

const DEFAULT_SAFETY = {
  selfHarmThoughts: "none" as const,
  urgentSupportRequested: false,
  notes: "",
};

const DEFAULT_PREFERENCES = {
  therapistStyle: [] as string[],
  homeworkComfort: "medium" as const,
};

const unique = <T>(items: T[]) => Array.from(new Set(items));

// Over-long input is truncated in preprocess (like knownList) instead of
// throwing, so a long answer never blocks someone from finishing intake.
function text(max = 1200) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim().slice(0, max) : ""),
    z.string().max(max),
  );
}

function textList(maxItems: number, maxLength = 240) {
  return z.preprocess(
    (value) =>
      Array.isArray(value)
        ? unique(
            value
              .filter((v): v is string => typeof v === "string")
              .map((v) => v.trim().slice(0, maxLength))
              .filter(Boolean),
          ).slice(0, maxItems)
        : [],
    z.array(z.string().min(1).max(maxLength)).max(maxItems),
  );
}

function knownList(allowed: readonly string[], maxItems: number) {
  return z.preprocess(
    (value) =>
      Array.isArray(value)
        ? unique(value.filter((v): v is string => typeof v === "string" && allowed.includes(v))).slice(0, maxItems)
        : [],
    z.array(z.string()).max(maxItems),
  );
}

const frequency = z.number().int().min(0).max(3).catch(0).default(0);

const CbtIntakeSchema = z.object({
  primaryProblems: textList(10),
  recentSituation: text(1200),
  automaticThoughts: text(1200),
  emotions: knownList(EMOTION_IDS, 12),
  bodySensations: knownList(BODY_IDS, 12),
  behaviors: knownList(BEHAVIOR_IDS, 12),
  strengths: textList(10),
  screening: z
    .object({
      lowMood: frequency,
      worry: frequency,
      panic: frequency,
      sleep: frequency,
      avoidance: frequency,
      concentration: frequency,
      functionalImpact: z.enum(["not", "somewhat", "very", "extreme"]).catch("not").default("not"),
    })
    .catch(DEFAULT_SCREENING)
    .default(DEFAULT_SCREENING),
  safety: z
    .object({
      selfHarmThoughts: z.enum(["none", "passive", "active", "prefer_not_say"]).catch("none").default("none"),
      urgentSupportRequested: z.boolean().catch(false).default(false),
      notes: text(1000),
    })
    .catch(DEFAULT_SAFETY)
    .default(DEFAULT_SAFETY),
  preferences: z
    .object({
      therapistStyle: knownList(STYLE_IDS, 5),
      homeworkComfort: z.enum(["low", "medium", "high"]).catch("medium").default("medium"),
    })
    .catch(DEFAULT_PREFERENCES)
    .default(DEFAULT_PREFERENCES),
});

export type CbtIntake = z.infer<typeof CbtIntakeSchema>;

export function normalizeCbtIntake(value: unknown): CbtIntake {
  return CbtIntakeSchema.parse(value ?? {});
}
