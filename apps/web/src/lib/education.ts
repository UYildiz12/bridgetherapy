export const CBT_LOOP = [
  {
    label: "Situation",
    detail: "The concrete moment, place, or trigger you can describe without interpreting it.",
  },
  {
    label: "Automatic thought",
    detail: "The fast meaning your mind attaches to the situation, often before you notice it.",
  },
  {
    label: "Feeling and body signal",
    detail: "Emotion, intensity, and physical cues such as tension, heat, heaviness, or restlessness.",
  },
  {
    label: "Response",
    detail: "What you do next: avoidance, checking, reassurance, reaching out, resting, or practicing a skill.",
  },
];

export const PSYCHOEDUCATION_MODULES = [
  {
    title: "Anxiety cycle",
    format: "Article + reflection prompt",
    focus: "Notice how threat predictions, body alarm, and avoidance can keep anxiety active.",
  },
  {
    title: "Sleep and routines",
    format: "Short lesson + checklist",
    focus: "Map sleep pressure, wind-down cues, and the routines that make rest more predictable.",
  },
  {
    title: "Thought records",
    format: "Worksheet + quiz",
    focus: "Separate facts from interpretations and practice balanced alternative thoughts.",
  },
];

export const CBT_PROTOCOLS = [
  {
    title: "Behavioral activation",
    useFor: "Low mood, withdrawal, and reduced routine.",
    homeworkSequence: ["Activity monitoring", "Values-ranked activity list", "Small scheduled action"],
    therapistReviewed: "Therapist-reviewed before assignment.",
  },
  {
    title: "Exposure ladder",
    useFor: "Avoidance patterns, panic, phobias, and OCD-adjacent work when clinically appropriate.",
    homeworkSequence: ["Trigger inventory", "Fear rating ladder", "Planned practice and reflection"],
    therapistReviewed: "Therapist-reviewed before assignment.",
  },
  {
    title: "Problem solving",
    useFor: "Practical stressors that need structured options rather than reassurance loops.",
    homeworkSequence: ["Define the problem", "Generate options", "Choose one experiment"],
    therapistReviewed: "Therapist-reviewed before assignment.",
  },
];
