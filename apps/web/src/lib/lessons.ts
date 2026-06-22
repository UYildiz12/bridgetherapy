// Detailed, CBT-informed lessons for the Wellness > Learn tab. Educational and
// meant to complement (not replace) work with a therapist.

export interface LessonSection {
  heading: string;
  body: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  sections: LessonSection[];
  keyPoints: string[];
  tryThis: string;
}

export const LESSONS: Lesson[] = [
  {
    id: "anxiety-cycle",
    title: "The anxiety cycle",
    minutes: 4,
    summary: "Why anxiety sticks around, and where it can be interrupted.",
    sections: [
      {
        heading: "What keeps it going",
        body: "Anxiety is the body's alarm for predicted danger. A trigger leads to a threat thought (\"this will go badly\"), which fires a body alarm (racing heart, tight chest), which pushes you to avoid or escape. Avoidance brings instant relief, so your brain learns the threat was real and the alarm was right. The relief is exactly what trains the cycle to repeat.",
      },
      {
        heading: "Where to interrupt it",
        body: "You usually cannot argue the body out of alarm in the moment. The most reliable lever is the response: approaching in small, survivable steps instead of avoiding. Each time you stay with discomfort and nothing catastrophic happens, the prediction updates and the alarm quiets over time.",
      },
    ],
    keyPoints: [
      "Avoidance lowers anxiety now but strengthens it later.",
      "Physical symptoms are uncomfortable, not dangerous.",
      "Approaching gradually is how predictions get corrected.",
    ],
    tryThis:
      "Name one small thing you have been avoiding. Pick a version that is 10% easier and plan to do it once this week, then notice what actually happens versus what you predicted.",
  },
  {
    id: "thought-records",
    title: "Thought records",
    minutes: 5,
    summary: "Separating facts from interpretations to find a steadier thought.",
    sections: [
      {
        heading: "Facts vs. interpretations",
        body: "When something happens, your mind adds meaning almost instantly. \"She did not reply\" is a fact; \"she is angry at me\" is an interpretation. Thought records slow this down so you can see the interpretation as one option, not the truth.",
      },
      {
        heading: "Building a balanced thought",
        body: "Write the situation, the hot thought, and the feeling. Then list evidence for and against the thought. A balanced thought is not forced positivity; it is the most accurate, fair read given all the evidence, and it usually lowers the feeling a notch.",
      },
    ],
    keyPoints: [
      "A thought is a mental event, not a fact.",
      "Look for evidence on both sides before deciding.",
      "Aim for accurate and fair, not relentlessly positive.",
    ],
    tryThis:
      "Catch one sticky thought today. Write the situation, the thought, and rate the feeling 0-100. List one piece of evidence against the thought, then re-rate the feeling.",
  },
  {
    id: "behavioral-activation",
    title: "Behavioral activation",
    minutes: 4,
    summary: "When mood is low, action often has to come before motivation.",
    sections: [
      {
        heading: "Mood follows action",
        body: "Low mood tells you to withdraw and wait until you feel like doing things. But waiting usually deepens the dip. Behavioral activation flips the order: you schedule small, meaningful actions first, and motivation tends to follow the doing rather than precede it.",
      },
      {
        heading: "Choosing the right activities",
        body: "The best activities give a sense of pleasure, accomplishment, or connection, and they line up with what you value. Start tiny and specific. A five-minute walk you actually do beats an hour-long plan you keep postponing.",
      },
    ],
    keyPoints: [
      "Don't wait to feel motivated; act, and motivation often follows.",
      "Pick activities tied to pleasure, mastery, or your values.",
      "Make the first step almost too small to fail.",
    ],
    tryThis:
      "Schedule one small activity for a specific time tomorrow. Rate your mood 0-10 just before and just after, and see whether doing it shifted the number.",
  },
  {
    id: "sleep-routines",
    title: "Sleep and routines",
    minutes: 5,
    summary: "Working with sleep pressure and your body clock instead of against them.",
    sections: [
      {
        heading: "The two systems behind sleep",
        body: "Sleep is driven by sleep pressure (which builds the longer you are awake) and your circadian rhythm (your internal clock, anchored by light and consistent timing). Naps, caffeine, and irregular wake times all blunt one of these systems and make falling asleep harder.",
      },
      {
        heading: "Protecting the bed-sleep link",
        body: "If you lie in bed awake, frustrated, your brain starts associating the bed with effort and worry. Stimulus control keeps the bed for sleep: if you are wide awake after a while, get up, do something calm and dim, and return when sleepy.",
      },
    ],
    keyPoints: [
      "Keep a consistent wake time, even after a rough night.",
      "Get daylight early; dim screens and lights before bed.",
      "If you can't sleep, leave the bed rather than fighting it.",
    ],
    tryThis:
      "Set one fixed wake-up time for the next three days and get a few minutes of daylight within an hour of waking. Notice any change in how sleepy you feel at night.",
  },
  {
    id: "riding-the-wave",
    title: "Riding the wave",
    minutes: 4,
    summary: "Letting strong emotions and urges crest and pass without acting on them.",
    sections: [
      {
        heading: "Emotions are waves",
        body: "Intense feelings and urges rise, peak, and fall on their own, usually within minutes if you do not feed them. The instinct is to act fast to make the feeling stop. Urge surfing is the practice of staying present with the sensation and watching it crest like a wave instead of being pulled under.",
      },
      {
        heading: "Naming and locating",
        body: "Naming an emotion (\"this is anxiety,\" \"this is shame\") reduces its grip, and noticing where it sits in the body turns an overwhelming state into something observable. You are not the wave; you are the surfer noticing it move.",
      },
    ],
    keyPoints: [
      "Urges peak and fade; you can outlast them.",
      "Naming a feeling lowers its intensity.",
      "Observing the body sensation creates distance from it.",
    ],
    tryThis:
      "Next time an urge hits, set a timer for ten minutes and just watch the sensation rise and fall, naming it once. See where the intensity is by the end.",
  },
  {
    id: "behavioral-experiments",
    title: "Behavioral experiments",
    minutes: 4,
    summary: "Testing a worried belief like a hypothesis instead of arguing with it.",
    sections: [
      {
        heading: "Treat the thought as a prediction",
        body: "Some beliefs do not budge through logic alone; they need evidence from real life. A behavioral experiment turns a belief into a testable prediction. \"If I ask a question in the meeting, people will think I'm stupid\" becomes something you can actually check by asking one question and watching what happens.",
      },
      {
        heading: "Predict, do, review",
        body: "Write the prediction and rate how strongly you believe it (0-100%). Design a small, specific action to test it. Do it, and note what actually happened versus what you expected. Then re-rate the belief. A noticeable drop is real evidence that the old prediction was overblown.",
      },
    ],
    keyPoints: [
      "Beliefs are hypotheses, not facts.",
      "Make the test small, specific, and doable.",
      "Compare the actual outcome to your prediction, then re-rate.",
    ],
    tryThis:
      "Pick one anxious prediction. Write it down with a 0-100% belief rating, do one small action to test it today, then re-rate how strongly you believe it afterward.",
  },
  {
    id: "facing-fears",
    title: "Facing fears, step by step",
    minutes: 5,
    summary: "Graded exposure: shrinking a fear by approaching it in tolerable steps.",
    sections: [
      {
        heading: "Build a fear ladder",
        body: "List the situations you avoid and rate each one 0-100 for how much anxiety it brings (clinicians call this SUDS). Arrange them from easiest to hardest so you have rungs at every level, from mildly uncomfortable up to very challenging.",
      },
      {
        heading: "Climb one rung at a time",
        body: "Start on a rung around 3-5 out of 10, not the easiest and not the most terrifying. Stay in the situation until your anxiety drops by about half. With repetition your body learns the feared thing is survivable (habituation), and you move up only when the current rung feels manageable.",
      },
    ],
    keyPoints: [
      "Avoidance shrinks your world; gradual approach grows it back.",
      "Rate situations 0-100 and start in the middle, not the extremes.",
      "Stay long enough for anxiety to fall by half, and repeat.",
    ],
    tryThis:
      "Write three things you avoid and rate each 0-100. Pick one around 3-5/10 and plan a single, repeatable practice of it this week. This is exposure work best done with your therapist's guidance.",
  },
  {
    id: "worry-uncertainty",
    title: "Worry and uncertainty",
    minutes: 4,
    summary: "Sorting solvable problems from unsolvable what-ifs, and loosening the need for certainty.",
    sections: [
      {
        heading: "Two kinds of worry",
        body: "Productive worry is about a real, current problem you can act on, so it leads to a plan. Unproductive worry is a chain of hypothetical what-ifs with no action attached. The skill is telling them apart: solvable worries get problem-solving, hypothetical ones get gently set down.",
      },
      {
        heading: "Worry feeds on certainty",
        body: "Much worry is an attempt to feel 100% certain that nothing will go wrong, which is impossible. Practising tolerating uncertainty, and even scheduling a short \"worry time\" rather than worrying all day, shrinks how much space worry takes up.",
      },
    ],
    keyPoints: [
      "Ask: is this a solvable problem or a hypothetical what-if?",
      "Solvable worries get a plan; hypothetical ones get postponed.",
      "Chasing total certainty fuels worry; tolerating doubt starves it.",
    ],
    tryThis:
      "Set a 15-minute \"worry window\" later today. When a worry shows up before then, jot it down and tell yourself you'll attend to it in the window. Notice how many still feel urgent when it arrives.",
  },
  {
    id: "core-beliefs",
    title: "Core beliefs underneath",
    minutes: 5,
    summary: "Finding the deeper rules that automatic thoughts grow from.",
    sections: [
      {
        heading: "Layers of thinking",
        body: "Automatic thoughts sit on top of deeper assumptions and core beliefs about yourself, other people, and the world (\"I'm not good enough,\" \"people can't be trusted\"). The same core belief can generate the same automatic thought across very different situations.",
      },
      {
        heading: "The downward arrow",
        body: "To find a core belief, take a hot thought and keep asking: \"If that were true, what would it mean about me?\" Follow the chain down until you reach the bedrock belief. Naming it is the first step; over time, gathering evidence helps build a kinder, more flexible belief alongside it.",
      },
    ],
    keyPoints: [
      "Surface thoughts grow from deeper core beliefs.",
      "The downward-arrow question reveals the belief underneath.",
      "Core beliefs are learned, and can be updated with evidence over time.",
    ],
    tryThis:
      "Take a recurring self-critical thought and ask \"what would that mean about me?\" three times in a row. Notice the deeper belief it points to, without trying to fix it yet. This goes deep, so it's good to explore with your therapist.",
  },
  {
    id: "self-compassion",
    title: "Self-compassion",
    minutes: 4,
    summary: "Replacing the harsh inner critic with the steadier voice you'd offer a friend.",
    sections: [
      {
        heading: "The critic isn't the coach",
        body: "Many people believe self-criticism keeps them in line, but harsh self-talk tends to add shame and drain motivation. Self-compassion is not letting yourself off the hook; it is meeting difficulty with the same steadiness and honesty you would give a friend who was struggling.",
      },
      {
        heading: "Three moves",
        body: "Self-compassion has three parts: kindness instead of judgment, remembering that struggle is part of being human rather than a personal defect, and mindful awareness of the pain without drowning in it. Together they make hard feelings easier to face and learn from.",
      },
    ],
    keyPoints: [
      "Self-criticism usually adds shame, not motivation.",
      "Talk to yourself like a friend you respect.",
      "Kindness, common humanity, and mindful awareness work together.",
    ],
    tryThis:
      "Think of how you'd speak to a close friend facing your exact situation. Write one or two of those sentences and read them back to yourself.",
  },
];

// Common thinking traps (cognitive distortions, Beck/Burns) for the interactive reference.
export interface ThinkingTrap {
  name: string;
  what: string;
  example: string;
  reframe: string;
}

export const THINKING_TRAPS: ThinkingTrap[] = [
  {
    name: "All-or-nothing",
    what: "Seeing things in absolute, black-and-white terms with no middle ground.",
    example: "\"I got one thing wrong, so the whole day was a failure.\"",
    reframe: "Where is this on a scale, not just success or failure?",
  },
  {
    name: "Overgeneralizing",
    what: "Treating one event as a never-ending pattern of defeat.",
    example: "\"That call went badly. I always mess these up.\"",
    reframe: "Is one instance really proof of always or never?",
  },
  {
    name: "Mental filter",
    what: "Zooming in on a single negative and screening out everything positive.",
    example: "\"They gave great feedback but mentioned one fix, so it was bad.\"",
    reframe: "What am I leaving out of the picture?",
  },
  {
    name: "Mind reading",
    what: "Assuming you know what others are thinking, usually the worst.",
    example: "\"She didn't smile, so she must be annoyed with me.\"",
    reframe: "What other explanations could there be? Do I actually know?",
  },
  {
    name: "Fortune telling",
    what: "Predicting the future will go badly as if it were already fact.",
    example: "\"If I go, I'll have a panic attack and humiliate myself.\"",
    reframe: "What has actually happened the other times I worried about this?",
  },
  {
    name: "Catastrophizing",
    what: "Blowing the importance of a problem far out of proportion.",
    example: "\"If I fail this, my whole career is over.\"",
    reframe: "What's most likely to happen, and could I cope if it did?",
  },
  {
    name: "Emotional reasoning",
    what: "Taking a feeling as proof of fact.",
    example: "\"I feel like a burden, so I must be one.\"",
    reframe: "A feeling is real, but is it evidence? What are the facts?",
  },
  {
    name: "Should statements",
    what: "Rigid rules about how you or others must be, which breed guilt or anger.",
    example: "\"I should never need help.\"",
    reframe: "Would I hold a friend to this rule? What's a fairer expectation?",
  },
  {
    name: "Labeling",
    what: "Turning a single action into a fixed, global label for the whole person.",
    example: "\"I made a mistake, so I'm a failure.\"",
    reframe: "Can I describe the behavior without branding the whole me?",
  },
  {
    name: "Personalizing",
    what: "Taking the blame for things that are not entirely in your control.",
    example: "\"The event flopped. It's all my fault.\"",
    reframe: "What factors besides me played a part here?",
  },
];
