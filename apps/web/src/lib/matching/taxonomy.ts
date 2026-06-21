/**
 * Shared taxonomy for patient intake and the therapist directory. The patient
 * (their needs) and the therapist (what they treat / when they work) pick from
 * the same lists, so a plain overlap yields both the match score and the reason.
 * Isomorphic: safe to import from client components and API routes.
 */

export const CONCERNS = [
  { id: "anxiety", label: "Anxiety" },
  { id: "depression", label: "Depression" },
  { id: "stress", label: "Stress & burnout" },
  { id: "sleep", label: "Sleep" },
  { id: "trauma", label: "Trauma & PTSD" },
  { id: "panic", label: "Panic" },
  { id: "ocd", label: "OCD" },
  { id: "relationships", label: "Relationships" },
  { id: "grief", label: "Grief & loss" },
  { id: "self_esteem", label: "Self-esteem" },
] as const;

export const AVAILABILITY = [
  { id: "weekday_daytime", label: "Weekday daytime" },
  { id: "evenings", label: "Evenings" },
  { id: "weekends", label: "Weekends" },
] as const;

export type ConcernId = (typeof CONCERNS)[number]["id"];
export type AvailabilityId = (typeof AVAILABILITY)[number]["id"];

const CONCERN_LABEL: Record<string, string> = Object.fromEntries(CONCERNS.map((c) => [c.id, c.label]));
const AVAILABILITY_LABEL: Record<string, string> = Object.fromEntries(
  AVAILABILITY.map((a) => [a.id, a.label]),
);

export const concernLabel = (id: string) => CONCERN_LABEL[id] ?? id;
export const availabilityLabel = (id: string) => AVAILABILITY_LABEL[id] ?? id;

export const CONCERN_IDS: string[] = CONCERNS.map((c) => c.id);
export const AVAILABILITY_IDS: string[] = AVAILABILITY.map((a) => a.id);

const RELATED_CONCERNS: Record<string, string[]> = {
  grief: ["depression"],
  ocd: ["anxiety"],
  panic: ["anxiety"],
  relationships: ["stress"],
  self_esteem: ["depression", "relationships"],
  sleep: ["stress", "anxiety"],
  stress: ["anxiety"],
  trauma: ["anxiety", "stress"],
};

export interface RelatedConcern {
  concern: string;
  matchedBy: string;
}

export interface Fit {
  score: number; // 0..100
  sharedConcerns: string[];
  relatedConcerns: RelatedConcern[];
  sharedAvailability: string[];
  reason: string;
}

/** Concern fit (weighted 0.8) plus availability overlap (0.2). */
export function computeFit(input: {
  patientConcerns: string[];
  patientAvailability: string[];
  therapistSpecialties: string[];
  therapistAvailability: string[];
}): Fit {
  const patientConcerns = unique(input.patientConcerns);
  const patientAvailability = unique(input.patientAvailability);
  const therapistSpecialties = new Set(unique(input.therapistSpecialties));
  const therapistAvailability = new Set(unique(input.therapistAvailability));

  const sharedConcerns = patientConcerns.filter((c) => therapistSpecialties.has(c));
  const relatedConcerns = patientConcerns
    .filter((c) => !therapistSpecialties.has(c))
    .flatMap((concern) => {
      const matchedBy = RELATED_CONCERNS[concern]?.find((related) =>
        therapistSpecialties.has(related),
      );
      return matchedBy ? [{ concern, matchedBy }] : [];
    });
  const sharedAvailability = patientAvailability.filter((a) => therapistAvailability.has(a));
  const concernPoints = sharedConcerns.length + relatedConcerns.length * 0.5;
  const concernFrac = patientConcerns.length
    ? concernPoints / patientConcerns.length
    : 0;
  const availFrac = patientAvailability.length
    ? sharedAvailability.length / patientAvailability.length
    : 0;
  const score = Math.round((concernFrac * 0.8 + availFrac * 0.2) * 100);
  return {
    score,
    sharedConcerns,
    relatedConcerns,
    sharedAvailability,
    reason: buildReason(sharedConcerns, relatedConcerns, sharedAvailability),
  };
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildReason(
  concerns: string[],
  relatedConcerns: RelatedConcern[],
  availability: string[],
): string {
  const bits: string[] = [];
  if (concerns.length) bits.push(`matches your focus on ${joinList(concerns.map(concernLabel))}`);
  if (relatedConcerns.length) {
    bits.push(
      `has related experience with ${joinList(
        relatedConcerns.map((r) => `${concernLabel(r.concern)} through ${concernLabel(r.matchedBy)}`),
      )}`,
    );
  }
  if (availability.length) bits.push(`offers ${joinList(availability.map(availabilityLabel))}`);
  if (!bits.length) return "Suggested from your intake.";
  const sentence = bits.join(", and ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}
