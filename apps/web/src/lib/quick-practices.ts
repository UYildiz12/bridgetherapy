// Short, guided micro-practices for the Wellness "Practice" tab.
// Each practice is a small sequence of steps the runner walks through. Some steps
// are passive (read and continue); others gently ask the person to name a thing,
// rate a feeling, or sit with a timer. Text inside {braces} is filled in from
// earlier answers, so a practice can quietly reflect back what someone wrote.

export type StepKind = "info" | "text" | "collect" | "slider" | "timer" | "reflect";

export interface PracticeStep {
  kind: StepKind;
  title: string;
  body?: string;
  /** A highlighted line, often a reframe. Supports {key} substitution. */
  quote?: string;
  /** Placeholder for text / collect inputs. */
  placeholder?: string;
  /** collect: a gentle target number of items (not a hard gate). */
  count?: number;
  /** timer: length in seconds. */
  seconds?: number;
  /** timer: optional label for a "I drifted" tap counter. */
  noteLabel?: string;
  /** slider: labels for the low and high ends. */
  minLabel?: string;
  maxLabel?: string;
  /** Where to keep this step's answer, for later substitution or reflection. */
  storeKey?: string;
  /** Footer button label override. */
  cta?: string;
  /** reflect: compare two stored slider values. */
  compare?: { fromKey: string; toKey: string };
}

export interface PracticeSummary {
  /** A paragraph on how the practice helps, in their situation. Supports {key}. */
  helps: string;
  /** Tailored prompts to carry into Lumen. Support {key} substitution. */
  lumen: string[];
}

export interface QuickPractice {
  id: string;
  title: string;
  duration: string;
  tagline: string;
  /** lucide icon key, mapped in the component. */
  icon: string;
  summary: PracticeSummary;
  steps: PracticeStep[];
}

export const QUICK_PRACTICES: QuickPractice[] = [
  {
    id: "grounding",
    title: "5-4-3-2-1 grounding",
    duration: "2 min",
    tagline: "Walk your five senses to get out of your head and back into the room.",
    icon: "hand",
    summary: {
      helps: "You named real things you could see, feel, hear, and smell, and one small move you can make next. That deliberate noticing is what pulls attention out of a spiral and back into the room you are actually in. The more specific you got, the better it works.",
      lumen: [
        'I just did a grounding exercise. The one kind thing I picked was "{do}". Help me actually follow through on it.',
        "When my thoughts start to spiral, what grounding anchors would work well for me?",
      ],
    },
    steps: [
      {
        kind: "info",
        title: "Five senses, one at a time",
        body: "This walks your attention out of your head and back into the room. No rush, and no wrong answers.",
        cta: "Begin",
      },
      {
        kind: "collect",
        title: "Five things you can see",
        body: "Look around and name them, one by one.",
        placeholder: "something you can see",
        count: 5,
        storeKey: "see",
      },
      {
        kind: "collect",
        title: "Four things you can feel",
        body: "The chair against your back, your feet on the floor, the air on your skin.",
        placeholder: "something you can feel",
        count: 4,
        storeKey: "touch",
      },
      {
        kind: "collect",
        title: "Three things you can hear",
        body: "Let the faint, far-off sounds count too.",
        placeholder: "a sound",
        count: 3,
        storeKey: "hear",
      },
      {
        kind: "collect",
        title: "Two things you can smell",
        body: "Or two you wish you could right now.",
        placeholder: "a scent",
        count: 2,
        storeKey: "smell",
      },
      {
        kind: "collect",
        title: "One kind next move",
        body: "Small counts. A glass of water. A slower breath. Standing up.",
        placeholder: "one next step",
        count: 1,
        storeKey: "do",
      },
      {
        kind: "info",
        title: "You're more here than you were a minute ago",
        body: "That's the whole point. Come back to this whenever the room gets loud.",
        cta: "Done",
      },
    ],
  },
  {
    id: "name-feeling",
    title: "Name the feeling",
    duration: "1 min",
    tagline: "Put words to what you're feeling and watch it lose a little of its grip.",
    icon: "heartPulse",
    summary: {
      helps: "You found where it sits, gave it a name, {name}, and put a number on it, around {level} out of a hundred. Naming a feeling like this hands some of it over to the thinking part of your brain, which is usually enough to take the edge off.",
      lumen: [
        "I'm feeling {name}, mostly in my {where}, about {level} out of 100. Help me understand what it might be pointing to.",
        "What tends to help when I'm feeling {name}?",
      ],
    },
    steps: [
      {
        kind: "info",
        title: "Naming a feeling takes some of its charge away",
        body: "Nothing to fix here. We're just going to describe it plainly.",
        cta: "Begin",
      },
      {
        kind: "text",
        title: "Where do you feel it?",
        body: "Your chest, your jaw, your stomach, your shoulders.",
        placeholder: "where it sits",
        storeKey: "where",
      },
      {
        kind: "text",
        title: "If it had a name, what would it be?",
        body: "Anxious, tired, small, wired, flat. Whatever actually fits.",
        placeholder: "name it",
        storeKey: "name",
      },
      {
        kind: "slider",
        title: "How loud is it right now?",
        minLabel: "barely there",
        maxLabel: "very loud",
        storeKey: "level",
      },
      {
        kind: "info",
        title: "You went from feeling it to seeing it",
        quote: "{name}, in your {where}, around {level} out of a hundred.",
        body: "That small step back is usually enough to loosen the grip a little.",
        cta: "Done",
      },
    ],
  },
  {
    id: "defusion",
    title: "Untangle a thought",
    duration: "2 min",
    tagline: "Set a sticky thought down where you can actually look at it.",
    icon: "brain",
    summary: {
      helps: "You took a thought that felt like a fact, {thought}, and held it at arm's length, then picked one small thing to do anyway: {step}. That gap between you and the thought is the whole skill, and it widens a little every time you practice.",
      lumen: [
        "I keep having the thought that {thought}. Help me weigh the evidence for and against it.",
        "My next small step is: {step}. Help me make it concrete and doable.",
      ],
    },
    steps: [
      {
        kind: "info",
        title: "A thought feels truer when it's tangled up with you",
        body: "Let's set it down somewhere you can look at it from the outside.",
        cta: "Begin",
      },
      {
        kind: "text",
        title: "What's the thought that keeps circling?",
        body: "Write it the way it really shows up in your head.",
        placeholder: "the thought",
        storeKey: "thought",
      },
      {
        kind: "info",
        title: "Now say it like this",
        quote: "I'm noticing the thought that {thought}",
        body: "Same words, a little distance. You're the one watching it now, not stuck inside it.",
        cta: "Okay",
      },
      {
        kind: "text",
        title: "What's one small thing you could do anyway?",
        body: "Not solve the whole thing. Just the next inch.",
        placeholder: "one small step",
        storeKey: "step",
      },
      {
        kind: "info",
        title: "There's the gap you just made",
        body: "The thought is still there. But now there's a you looking at it, with a next step in hand.",
        cta: "Done",
      },
    ],
  },
  {
    id: "anchor",
    title: "Anchor your attention",
    duration: "1 min",
    tagline: "One minute of returning to a single point, again and again.",
    icon: "target",
    summary: {
      helps: "You rested your attention on {anchor} for a minute and kept bringing it back. The returning, not the staying, is what actually builds focus, and you just got a set of reps in.",
      lumen: [
        "I want to get better at noticing when my attention drifts and bringing it back. Help me build a small daily habit around it.",
      ],
    },
    steps: [
      {
        kind: "info",
        title: "A minute of attention training",
        body: "Drifting off isn't failure here. Noticing it and coming back is the entire rep.",
        cta: "Begin",
      },
      {
        kind: "text",
        title: "What will you rest your attention on?",
        body: "An object across the room, your breath, one steady sound.",
        placeholder: "your anchor",
        storeKey: "anchor",
      },
      {
        kind: "timer",
        title: "Rest your attention on {anchor}",
        body: "Drifted off? Tap below, then bring it back. As many times as it takes.",
        seconds: 60,
        noteLabel: "I drifted",
        storeKey: "drifts",
      },
      {
        kind: "info",
        title: "Every time you came back, that was the exercise",
        body: "Focus isn't staying put. It's returning, over and over. You just practiced the only part that matters.",
        cta: "Done",
      },
    ],
  },
  {
    id: "three-things",
    title: "Three things that held up",
    duration: "1 min",
    tagline: "Count three small things that actually went okay today.",
    icon: "listChecks",
    summary: {
      helps: "You counted three things that genuinely went okay: {things}. Your mind skips over these by default, so naming them on purpose gives you a fuller, fairer picture of how the day actually went.",
      lumen: [
        "Three things that went okay today: {things}. Help me notice what they say about what matters to me.",
      ],
    },
    steps: [
      {
        kind: "info",
        title: "Three things that went okay",
        body: "Not gratitude theatre. Just small things your mind skips over by default.",
        cta: "Begin",
      },
      {
        kind: "collect",
        title: "What went okay today?",
        body: "A decent coffee. A text back. Getting out of bed at all.",
        placeholder: "one thing",
        count: 3,
        storeKey: "things",
      },
      {
        kind: "info",
        title: "Three more than your brain would've offered on its own",
        body: "This isn't pretending everything's fine. It's a fuller, fairer picture of the day.",
        cta: "Done",
      },
    ],
  },
  {
    id: "urge-surf",
    title: "Ride the urge",
    duration: "2 min",
    tagline: "Watch an urge rise and fall on its own, without acting on it.",
    icon: "waves",
    summary: {
      helps: "You watched an urge move from {before} to {after} out of a hundred without acting on it. That is the proof that urges crest and fall on their own, and the next one will be a little easier to ride out.",
      lumen: [
        "I rode out an urge and it dropped from {before} to {after} without acting on it. Help me plan for the next time it shows up.",
      ],
    },
    steps: [
      {
        kind: "info",
        title: "An urge feels like it'll keep growing until you give in",
        body: "It won't. Urges rise, crest, and fade on their own. Let's watch one do exactly that.",
        cta: "Begin",
      },
      {
        kind: "slider",
        title: "How strong is the urge right now?",
        minLabel: "faint",
        maxLabel: "intense",
        storeKey: "before",
      },
      {
        kind: "timer",
        title: "Stay with it for one minute",
        body: "Don't fight it, don't feed it. Watch it like weather moving through.",
        seconds: 60,
        cta: "Done",
      },
      {
        kind: "slider",
        title: "And now, how strong is it?",
        minLabel: "faint",
        maxLabel: "intense",
        storeKey: "after",
      },
      {
        kind: "reflect",
        title: "Watch what just happened",
        compare: { fromKey: "before", toKey: "after" },
        cta: "Done",
      },
    ],
  },
];
