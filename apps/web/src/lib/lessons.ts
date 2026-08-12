// Detailed, CBT-informed lessons for the Wellness > Learn tab. Educational and
// meant to complement (not replace) work with a therapist. Grounded in the
// cognitive model (Beck), the maintenance / vicious cycle and negative
// reinforcement of safety behaviours (Salkovskis), behavioural activation
// (Jacobson, Dimidjian), the inhibitory-learning account of exposure (Craske),
// the two-process model of sleep (Borbely) and stimulus control (Bootzin),
// affect labeling (Lieberman), intolerance of uncertainty (Dugas), and
// self-compassion (Neff) / compassion-focused therapy (Gilbert).

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
    minutes: 5,
    summary: "Why anxiety keeps its grip, and the one place it reliably loosens.",
    sections: [
      {
        heading: "What keeps it running",
        body: "Anxiety is the body's alarm for danger it predicts, not danger that is necessarily present. A trigger sparks a threat read (\"this will go badly\"), the body floods with alarm (racing heart, tight chest, narrowed focus), and you do something to make it stop: avoid, escape, check, or ask to be reassured. Each of those brings quick relief, and the relief is the catch. It teaches the brain that the threat was real and that the safety move is what saved you, so the alarm returns a little louder next time. Clinicians call this negative reinforcement, and it is why anxiety tends to grow in exactly the situations you handle by backing away from them.",
      },
      {
        heading: "Where it loosens",
        body: "You usually cannot reason the body out of alarm while it is firing, so that is not where the work happens. The reliable lever is what you do next. When you approach something you would normally avoid and the feared outcome does not arrive, or you find you can cope even when it does, the original prediction takes a hit. Modern exposure research frames this as new learning rather than erasing the old fear: a truer association, \"I can handle this,\" grows alongside the alarm and gradually starts to win.",
      },
    ],
    keyPoints: [
      "Relief from avoiding is short-lived and trains the alarm to come back.",
      "The body's symptoms are intensely uncomfortable, not dangerous.",
      "Approaching, and being surprised by the outcome, is what updates the fear.",
    ],
    tryThis:
      "Name one thing you have been steering around. Pick a version about ten percent easier, write down what you expect to happen, then do it once and compare the prediction to what actually occurred.",
  },
  {
    id: "thought-records",
    title: "Thought records",
    minutes: 5,
    summary: "Catching the gap between what happened and the story you told about it.",
    sections: [
      {
        heading: "Fact, then interpretation",
        body: "Something happens and your mind adds meaning so fast the two feel like one thing. \"She did not reply\" is a fact. \"She is annoyed with me\" is an interpretation, and only one of several that fit the same fact. A thought record slows that moment down on paper so you can see the interpretation as a guess rather than a verdict. This is the heart of Beck's cognitive model: the event does not set the feeling, the appraisal of it does.",
      },
      {
        heading: "Toward a fairer read",
        body: "Write the situation, the hottest thought, and how strong the feeling is out of a hundred. Then gather evidence on both sides, the facts that fit the thought and the facts that do not. What you are after is not a cheerful spin but the most accurate account given everything you know, the version that would hold up if a fair-minded friend looked at it with you. A more balanced thought rarely makes the feeling vanish, but it usually takes it down a notch, and a notch is often enough to think and act more clearly.",
      },
    ],
    keyPoints: [
      "A thought is a mental event you can examine, not a fact you must obey.",
      "Weigh the evidence for and against before deciding what is true.",
      "Aim for accurate and fair, not relentlessly positive.",
    ],
    tryThis:
      "Catch one sticky thought today. Write the situation, the thought, and rate the feeling out of a hundred. Add one solid piece of evidence that does not fit the thought, then rate the feeling again.",
  },
  {
    id: "behavioral-activation",
    title: "Behavioral activation",
    minutes: 4,
    summary: "When mood is low, doing usually has to come before feeling like it.",
    sections: [
      {
        heading: "Mood follows action",
        body: "Low mood gives clear instructions: pull back, cancel, wait until you feel up to things. Following them tends to deepen the dip, because withdrawing strips out the very experiences that lift mood and the day empties. Behavioral activation reverses the order. You schedule small, meaningful actions first and let motivation catch up to the doing, instead of waiting for a motivation that low mood will not supply. In trials going back to Jacobson and Dimidjian, this approach holds up as well as full cognitive therapy for depression, including more severe cases.",
      },
      {
        heading: "Choosing what to schedule",
        body: "The actions that actually shift mood tend to offer one of three things: a little pleasure, a sense of accomplishment, or connection with someone, and they line up with what you genuinely care about. Start far smaller than feels worthwhile. A five-minute walk you complete beats the hour-long plan you keep pushing to tomorrow, because the point is to break the withdrawal loop and collect first-hand evidence that doing still does something.",
      },
    ],
    keyPoints: [
      "Don't wait for motivation; act first, and it tends to follow.",
      "Favour activities tied to pleasure, mastery, or connection, and to your values.",
      "Make the first step almost too small to fail.",
    ],
    tryThis:
      "Pick one small activity and put it in tomorrow at a specific time. Rate your mood out of ten just before and just after, and see whether doing it moved the number.",
  },
  {
    id: "sleep-routines",
    title: "Sleep and routines",
    minutes: 5,
    summary: "Working with the two systems that run sleep instead of fighting them.",
    sections: [
      {
        heading: "The two-process model",
        body: "Sleep is governed by two systems working together. One is sleep pressure, a kind of appetite for sleep that builds the longer you are awake. The other is your circadian rhythm, the internal clock that decides when you feel alert or drowsy, set largely by light and by consistent timing. Naps, late caffeine, and a wake time that drifts all weaken one of these, which is why a night can feel wired or wide awake despite a long day. Sleep scientists call this the two-process model, and most good sleep advice is really about protecting it.",
      },
      {
        heading: "Keeping the bed for sleep",
        body: "Lie in bed awake and frustrated often enough and the brain learns a quiet new link: bed means effort and worry, not rest. Stimulus control breaks that link by reserving the bed for sleep alone. If you are clearly awake after a while, get up, do something calm in dim light, and return only when sleepiness comes back. It feels counterintuitive, but it rebuilds the association between bed and sleep that insomnia erodes, and it is one of the most evidence-backed pieces of CBT for insomnia.",
      },
    ],
    keyPoints: [
      "Hold a steady wake time, even after a bad night; it anchors the clock.",
      "Get daylight early, and dim screens and lights as bedtime nears.",
      "If you are wide awake, leave the bed rather than fighting for sleep in it.",
    ],
    tryThis:
      "Fix one wake-up time for the next three days and get a few minutes of daylight within an hour of rising. Notice whether you feel sleepier at a sensible hour by the third night.",
  },
  {
    id: "riding-the-wave",
    title: "Riding the wave",
    minutes: 4,
    summary: "Letting a strong feeling or urge crest and pass without acting on it.",
    sections: [
      {
        heading: "Feelings move like waves",
        body: "Intense emotions and urges rise, peak, and fall on their own, often within minutes, as long as you do not keep feeding them with replay or resistance. The instinct is to act at once to shut the feeling down, which works briefly and quietly teaches you that you could not have survived it otherwise. Urge surfing, a skill from relapse-prevention work, is the alternative: you stay with the sensation and watch it move, the way a surfer rides a wave instead of being dragged under.",
      },
      {
        heading: "Name it to loosen it",
        body: "Putting a feeling into words does more than describe it. In Lieberman's affect labeling studies, simply naming an emotion (\"this is anxiety,\" \"this is shame\") lowered activity in the brain's threat centre and brought the thinking regions back online. Pair the name with where you feel it in the body and the state shifts from something that has you to something you are watching. You are not the wave. You are the one noticing it pass.",
      },
    ],
    keyPoints: [
      "Urges crest and fade; you can usually outlast them.",
      "Naming a feeling measurably lowers its intensity.",
      "Noticing the body sensation creates distance from it.",
    ],
    tryThis:
      "Next time an urge hits, set a timer for ten minutes and just watch the sensation rise and fall, naming it once. Check where the intensity sits when the timer ends.",
  },
  {
    id: "behavioral-experiments",
    title: "Behavioral experiments",
    minutes: 4,
    summary: "Testing a worried belief like a hypothesis instead of debating it in your head.",
    sections: [
      {
        heading: "Turn the belief into a prediction",
        body: "Some beliefs will not move through reasoning, however good the argument, because they were never built on argument in the first place. They shift when life hands you evidence. A behavioral experiment turns a belief into something testable. \"If I ask a question in the meeting, people will think I am stupid\" becomes a prediction you can actually check by asking one question and watching what happens to the room and the conversation.",
      },
      {
        heading: "Predict, do, review",
        body: "Write the prediction and rate how strongly you believe it out of a hundred. Design one small, specific action that would put it to the test, ideally dropping any safety behaviour you would normally lean on, since that is what usually lets you credit a good outcome to the prop rather than to reality. Do it, set what really happened next to what you expected, then rate the belief again. Across the research, this kind of experiential learning shifts conviction faster and more durably than talking a thought through, because you are no longer taking your own word for it.",
      },
    ],
    keyPoints: [
      "Treat beliefs as hypotheses, not settled facts.",
      "Keep the test small, specific, and genuinely doable.",
      "Living evidence changes a belief faster than argument does.",
    ],
    tryThis:
      "Pick one anxious prediction. Write it with a belief rating out of a hundred, run one small action today to test it, then re-rate how strongly you believe it afterward.",
  },
  {
    id: "facing-fears",
    title: "Facing fears, step by step",
    minutes: 5,
    summary: "Graded exposure, and why being surprised matters more than calming down.",
    sections: [
      {
        heading: "Build a ladder",
        body: "List the situations you avoid and rate each for how much anxiety it brings, from zero to a hundred (clinicians call this rating SUDS). Arrange them from mildly uncomfortable up to genuinely hard so there is a rung at every level. The ladder turns one overwhelming fear into a series of approachable steps, and it gives you somewhere sensible to begin that is neither trivial nor terrifying.",
      },
      {
        heading: "Climb toward the surprise",
        body: "Older exposure advice said to stay until your anxiety dropped by half. The newer inhibitory-learning model points somewhere more useful: stay until your expectation is proven wrong. What you are after is the gap between what you feared (\"I will panic and have to flee\") and what occurs (\"it was uncomfortable and I stayed\"). That surprise is what builds a new, competing association that the feared thing is survivable. Drop the safety behaviours that would let you explain away the result, repeat it in different settings, and let the prediction, not the fear level, tell you it worked.",
      },
    ],
    keyPoints: [
      "Avoidance shrinks your world; graded approach grows it back.",
      "Rate situations zero to a hundred and start in the middle, not the extremes.",
      "Stay until the feared outcome is disconfirmed, and drop your safety props.",
    ],
    tryThis:
      "Write three things you avoid and rate each zero to a hundred. Pick one in the lower-middle, name exactly what you predict will happen, and plan one repeatable practice this week. Exposure is best done with a therapist's guidance.",
  },
  {
    id: "worry-uncertainty",
    title: "Worry and uncertainty",
    minutes: 5,
    summary: "Sorting solvable problems from what-ifs, and loosening the need to know.",
    sections: [
      {
        heading: "Two kinds of worry",
        body: "Productive worry is attached to a real, present problem you can do something about, so it ends in a plan. Unproductive worry is a chain of hypothetical what-ifs with no action at the other end, and it tends to breed more of itself. The first skill is simply telling them apart in the moment. Solvable worries get problem-solving. Hypothetical ones get noticed, named as hypothetical, and set down, which is a skill that sharpens with practice rather than a switch you flip.",
      },
      {
        heading: "Worry runs on the need to be certain",
        body: "Much chronic worry is an attempt to feel completely sure that nothing will go wrong, which no amount of thinking can deliver. Researchers call the underlying driver intolerance of uncertainty, and in treatment studies for generalized anxiety, reducing it accounts for the majority of the drop in worry. You loosen it not by getting more certain but by practising acting while uncertain, in small doses, and discovering that not knowing is uncomfortable rather than dangerous. A short, scheduled worry window can help contain the rest of the day.",
      },
    ],
    keyPoints: [
      "Ask whether this is a solvable problem or a hypothetical what-if.",
      "Solvable worries get a plan; hypothetical ones get postponed.",
      "Chasing total certainty feeds worry; tolerating doubt starves it.",
    ],
    tryThis:
      "Set a fifteen-minute worry window later today. When a worry arrives before then, jot it down and tell yourself you will deal with it in the window. Notice how many still feel urgent once it comes.",
  },
  {
    id: "core-beliefs",
    title: "Core beliefs underneath",
    minutes: 5,
    summary: "The deeper rules that the same automatic thoughts keep growing from.",
    sections: [
      {
        heading: "Thinking has layers",
        body: "Cognitive therapy describes thought in layers. At the surface are automatic thoughts, the quick appraisals that flit through a situation. Beneath them sit assumptions and rules, often shaped as if-then (\"if I am not useful, I will be rejected\"). Deeper still are core beliefs, the flat statements about yourself, others, and the world that you absorbed early and rarely question (\"I am not good enough,\" \"people cannot be trusted\"). One core belief can quietly generate the same automatic thought across situations that look nothing alike.",
      },
      {
        heading: "Following the arrow down",
        body: "A simple way to find the belief underneath is the downward arrow: take a hot thought and keep asking, \"if that were true, what would it say about me?\" until you reach something that feels like bedrock. Naming it matters, because core beliefs work best in the dark, steering what you notice and remember so they keep being confirmed. Once it is in the open, you can begin, slowly, to gather the evidence it has been screening out and grow a fairer belief beside it. This one runs deep, and is often best explored alongside a therapist.",
      },
    ],
    keyPoints: [
      "Surface thoughts grow from deeper assumptions and core beliefs.",
      "The downward-arrow question surfaces the belief underneath.",
      "Core beliefs are learned, and can be updated with evidence over time.",
    ],
    tryThis:
      "Take a recurring self-critical thought and ask \"what would that say about me?\" three times in a row. Notice the deeper belief it points to, without rushing to fix it. Because this goes deep, it is good to explore with your therapist.",
  },
  {
    id: "self-compassion",
    title: "Self-compassion",
    minutes: 4,
    summary: "Trading the harsh inner critic for the steadier voice you would give a friend.",
    sections: [
      {
        heading: "The critic is not the coach",
        body: "Many people keep the inner critic on staff because they believe it drives them. The evidence runs the other way: harsh self-talk mostly adds shame, and shame drains the energy you need to change. Compassion-focused work traces this to two different systems in us, a threat system the critic keeps switched on and a soothing system that steadies us, and self-criticism keeps you stuck in the first. Self-compassion is not letting yourself off the hook. It is meeting difficulty with the same honesty and steadiness you would offer someone you respect.",
      },
      {
        heading: "Three parts that work together",
        body: "In Kristin Neff's research, self-compassion has three strands. Kindness toward yourself rather than judgment. Common humanity, the recognition that struggling is part of being a person and not a private defect. And mindful awareness that faces the pain without being swept away by it or pretending it is not there. Held together, they make hard feelings easier to stay with, and people higher in self-compassion tend to report less anxiety and depression and to recover from setbacks more readily.",
      },
    ],
    keyPoints: [
      "Self-criticism usually adds shame, not motivation.",
      "Speak to yourself like a friend you respect and want to help.",
      "Kindness, common humanity, and mindful awareness work together.",
    ],
    tryThis:
      "Think of how you would speak to a close friend in your exact situation. Write down one or two of those sentences, then read them back to yourself as if they were meant for you.",
  },
];

// Common thinking traps (cognitive distortions, Beck/Burns) for the interactive reference.
// `icon` maps to a lucide icon in the Learn UI.
export interface ThinkingTrap {
  name: string;
  icon: string;
  what: string;
  examples: string[];
  reframe: string;
}

export const THINKING_TRAPS: ThinkingTrap[] = [
  {
    name: "All-or-nothing",
    icon: "contrast",
    what: "Seeing things in absolute, black-and-white terms with no middle ground.",
    examples: [
      "\"I got one thing wrong, so the whole day was a failure.\"",
      "\"If I'm not the best at this, there's no point even trying.\"",
    ],
    reframe: "Where does this actually sit on a scale, not just success or failure?",
  },
  {
    name: "Overgeneralizing",
    icon: "repeat",
    what: "Treating one event as a never-ending pattern of defeat.",
    examples: [
      "\"That call went badly. I always mess these up.\"",
      "\"He cancelled once, so nobody really wants my company.\"",
    ],
    reframe: "Is one instance really proof of always or never?",
  },
  {
    name: "Mental filter",
    icon: "filter",
    what: "Zooming in on a single negative and screening out everything positive.",
    examples: [
      "\"They praised the report but flagged one typo, so it was bad.\"",
      "\"The day had good moments, but I only replay the tense one.\"",
    ],
    reframe: "What am I leaving out of the picture?",
  },
  {
    name: "Mind reading",
    icon: "eye",
    what: "Assuming you know what others are thinking, usually the worst.",
    examples: [
      "\"She didn't smile back, so she must be annoyed with me.\"",
      "\"They went quiet; I just know they think I'm boring.\"",
    ],
    reframe: "What other explanations could there be? Do I actually know?",
  },
  {
    name: "Fortune telling",
    icon: "telescope",
    what: "Predicting the future will go badly as if it were already fact.",
    examples: [
      "\"If I go, I'll have a panic attack and humiliate myself.\"",
      "\"There's no point applying; I already know I'll be rejected.\"",
    ],
    reframe: "What has actually happened the other times I worried about this?",
  },
  {
    name: "Catastrophizing",
    icon: "cloudLightning",
    what: "Blowing the importance of a problem far out of proportion.",
    examples: [
      "\"If I fail this, my whole career is over.\"",
      "\"This headache is probably something serious.\"",
    ],
    reframe: "What's most likely to happen, and could I cope if it did?",
  },
  {
    name: "Emotional reasoning",
    icon: "heart",
    what: "Taking a feeling as proof of fact.",
    examples: [
      "\"I feel like a burden, so I must be one.\"",
      "\"I feel guilty, so I must have done something wrong.\"",
    ],
    reframe: "A feeling is real, but is it evidence? What are the facts?",
  },
  {
    name: "Should statements",
    icon: "gavel",
    what: "Rigid rules about how you or others must be, which breed guilt or anger.",
    examples: [
      "\"I should never need help.\"",
      "\"They should just know what I need without me saying it.\"",
    ],
    reframe: "Would I hold a friend to this rule? What's a fairer expectation?",
  },
  {
    name: "Labeling",
    icon: "tag",
    what: "Turning a single action into a fixed, global label for the whole person.",
    examples: [
      "\"I made a mistake, so I'm a failure.\"",
      "\"I got nervous, so I'm just pathetic.\"",
    ],
    reframe: "Can I describe the behavior without branding the whole me?",
  },
  {
    name: "Personalizing",
    icon: "target",
    what: "Taking the blame for things that are not entirely in your control.",
    examples: [
      "\"The event flopped, and it's entirely my fault.\"",
      "\"They seem upset, so I must have caused it.\"",
    ],
    reframe: "What factors besides me played a part here?",
  },
];
