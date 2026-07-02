import type { HomeworkDoc } from "./blocks";

/**
 * Shipped homework presets: evidence-based CBT worksheets as v2 block
 * documents. Loaded into the builder as a starting point and saved as the
 * therapist's own set, so edits never touch these.
 */

export interface HomeworkPreset {
  id: string;
  title: string;
  description: string;
  doc: HomeworkDoc;
}

const thoughtRecord: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "once" },
  blocks: [
    {
      type: "text",
      id: "intro",
      body: "Catch one sticky thought and walk it through the columns. You are after the most accurate, fair read, not the most positive one.",
    },
    { type: "input.text", id: "situation", label: "Situation", multiline: true, placeholder: "Where were you? What happened?" },
    { type: "input.text", id: "emotion", label: "Emotion", placeholder: "One or two words" },
    { type: "input.scale", id: "intensity-before", label: "How strong is it?", min: 0, max: 100, minLabel: "barely", maxLabel: "overwhelming" },
    { type: "input.text", id: "thought", label: "Automatic thought", multiline: true, placeholder: "Word for word, as it showed up" },
    { type: "input.text", id: "evidence-for", label: "Evidence for", multiline: true },
    { type: "input.text", id: "evidence-against", label: "Evidence against", multiline: true },
    { type: "input.text", id: "balanced", label: "A fairer thought", multiline: true },
    { type: "input.scale", id: "intensity-after", label: "And now, how strong?", min: 0, max: 100, minLabel: "barely", maxLabel: "overwhelming" },
  ],
};

const sleepDiary: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "daily" },
  blocks: [
    { type: "text", id: "intro", body: "Fill this in each morning, within an hour of waking if you can." },
    { type: "input.scale", id: "rested", label: "How rested do you feel?", min: 1, max: 10 },
    { type: "input.text", id: "bedtime", label: "Lights out / lights on", placeholder: "23:30 / 07:10" },
    { type: "input.scale", id: "latency", label: "Roughly how long to fall asleep (minutes)?", min: 0, max: 120, step: 5 },
    { type: "input.text", id: "notes", label: "Anything that helped or got in the way?", multiline: true, optional: true },
  ],
};

const exposureLadder: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "once" },
  blocks: [
    { type: "heading", id: "h-ladder", text: "Build your ladder" },
    {
      type: "text",
      id: "intro",
      body: "List situations you avoid, from mildly uncomfortable to genuinely hard. Rate each for the anxiety it brings right now.",
    },
    {
      type: "input.table",
      id: "ladder",
      label: "Situations, easiest to hardest",
      columns: [
        { id: "situation", header: "Situation", kind: "text" },
        { id: "suds", header: "Anxiety (0-100)", kind: "scale", min: 0, max: 100 },
      ],
      minRows: 5,
    },
    { type: "heading", id: "h-log", text: "Practice log" },
    {
      type: "input.table",
      id: "practice",
      label: "Each practice, as you do it",
      columns: [
        { id: "what", header: "What I did", kind: "text" },
        { id: "before", header: "Before (0-100)", kind: "scale", min: 0, max: 100 },
        { id: "after", header: "After (0-100)", kind: "scale", min: 0, max: 100 },
        { id: "learned", header: "What actually happened", kind: "text" },
      ],
      minRows: 1,
    },
  ],
};

const activationSchedule: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "daily" },
  blocks: [
    {
      type: "text",
      id: "intro",
      body: "Plan one or two small activities for the day, then note how each actually felt. Doing comes first; motivation tends to follow.",
    },
    {
      type: "input.table",
      id: "plan",
      label: "Today's plan",
      columns: [
        { id: "activity", header: "Activity", kind: "text" },
        { id: "felt", header: "How it felt (0-10)", kind: "scale", min: 0, max: 10 },
      ],
      minRows: 1,
    },
    { type: "input.scale", id: "mood", label: "Mood at the end of the day", min: 1, max: 10 },
    { type: "input.activity", id: "checkin", label: "Log a mood check-in in the app", activity: "mood-checkin", optional: true },
  ],
};

const worryLog: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "daily" },
  blocks: [
    {
      type: "text",
      id: "intro",
      body: "When a worry sticks, write it down and sort it. Solvable worries get a next step; hypothetical ones get set down.",
    },
    { type: "input.text", id: "worry", label: "The worry", multiline: true },
    { type: "input.choice", id: "sort", label: "Which kind is it?", options: ["Solvable now", "Hypothetical what-if"] },
    { type: "input.text", id: "step", label: "If solvable: the next small step", multiline: true, optional: true },
    { type: "input.scale", id: "urgency", label: "How urgent does it feel?", min: 0, max: 100, minLabel: "calm", maxLabel: "urgent" },
  ],
};

const moodMeasure: HomeworkDoc = {
  version: 2,
  schedule: { cadence: "weekly" },
  blocks: [
    {
      type: "text",
      id: "intro",
      body: "Over the last week, how often have you been bothered by each of the following? Answer quickly; first instinct is fine.",
    },
    { type: "input.choice", id: "q-interest", label: "Little interest or pleasure in doing things", options: ["Not at all", "Several days", "More than half the days", "Nearly every day"], scored: true },
    { type: "input.choice", id: "q-mood", label: "Feeling down, depressed, or hopeless", options: ["Not at all", "Several days", "More than half the days", "Nearly every day"], scored: true },
    { type: "input.choice", id: "q-anxious", label: "Feeling nervous, anxious, or on edge", options: ["Not at all", "Several days", "More than half the days", "Nearly every day"], scored: true },
    { type: "input.choice", id: "q-worry", label: "Not being able to stop or control worrying", options: ["Not at all", "Several days", "More than half the days", "Nearly every day"], scored: true },
    { type: "input.scale", id: "overall", label: "Overall, how was the week?", min: 1, max: 10, minLabel: "very hard", maxLabel: "very good" },
  ],
};

export const PRESETS: HomeworkPreset[] = [
  { id: "thought-record", title: "Thought record", description: "The classic seven-column CBT worksheet.", doc: thoughtRecord },
  { id: "sleep-diary", title: "Sleep diary", description: "A short morning entry, daily until the due date.", doc: sleepDiary },
  { id: "exposure-ladder", title: "Exposure ladder and practice log", description: "Build the ladder, then log each practice.", doc: exposureLadder },
  { id: "activation-schedule", title: "Behavioral activation schedule", description: "Plan small activities and track how they land.", doc: activationSchedule },
  { id: "worry-log", title: "Worry log", description: "Sort worries into solvable and hypothetical, daily.", doc: worryLog },
  { id: "mood-measure", title: "Mood and anxiety measure", description: "A short scored weekly check, comparable over time.", doc: moodMeasure },
];
