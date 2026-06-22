// Content + geometry for the animated CBT loop centerpiece (Wellness > Learn).
// The loop has four parts arranged around a ring, and three phases that show how
// the same loop forms, tightens with repetition, and finally breaks.
//
// Grounded in the cognitive model (Beck), the maintenance / vicious cycle and
// negative reinforcement of safety behaviours (Salkovskis & Warwick), and the
// standard ways CBT interrupts it: cognitive restructuring, behavioural
// experiments, and dropping safety behaviours in stages.

export type NodeKey = "situation" | "thought" | "feeling" | "response";

export interface LoopNode {
  key: NodeKey;
  index: number;
  label: string;
  role: string;
  icon: string;
  /** Degrees clockwise from the top of the ring. */
  angle: number;
}

// Ordered around the ring clockwise: top, right, bottom, left.
export const LOOP_NODES: LoopNode[] = [
  { key: "situation", index: 1, label: "Situation", role: "Something happens", icon: "mapPin", angle: 0 },
  { key: "thought", index: 2, label: "Thought", role: "You read it as fact", icon: "zap", angle: 90 },
  { key: "feeling", index: 3, label: "Feeling", role: "It lands in the body", icon: "heartPulse", angle: 180 },
  { key: "response", index: 4, label: "Response", role: "You act to cope", icon: "footprints", angle: 270 },
];

export interface LoopPhase {
  id: "form" | "tighten" | "break";
  tab: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  takeaway: string;
  /** Short per-node annotation shown on the example strip for this phase. */
  lens?: Partial<Record<NodeKey, string>>;
}

export const LOOP_PHASES: LoopPhase[] = [
  {
    id: "form",
    tab: "It forms",
    kicker: "One pass",
    title: "First, the loop forms",
    paragraphs: [
      "Run it once and it reads like plain cause and effect. Something happens. You have a thought about it. The thought brings a feeling, in your mind and your body at the same time. You do something with that feeling. Four parts, one lap.",
      "The whole thing turns on the second part. The thought arrives so fast it never feels like a thought, it feels like a straight read of what just happened. That is the move to watch: a guess, wearing the face of a fact.",
    ],
    takeaway: "The thought in the middle is an interpretation, not a fact. Everything downstream is built on it.",
  },
  {
    id: "tighten",
    tab: "It tightens",
    kicker: "Same lap, again and again",
    title: "Then it tightens",
    paragraphs: [
      "Now run the same lap a few more times. Whatever you do to cope, checking, avoiding, replaying, asking to be reassured, brings a small wave of relief. The relief feels like the loop working in your favour. It is not. It is the reward that trains the loop to fire faster.",
      "Each pass, the thought gets questioned a little less and the lap gets shorter. What began as one reaction settles into a groove, then into a reflex you barely notice running. The short-term calm is real, and it is exactly what keeps the whole thing turning.",
    ],
    takeaway: "Relief from avoiding is the fuel. It soothes now and teaches the loop to come back later.",
    lens: {
      thought: "Questioned less with every pass.",
      response: "The relief here is the reward that trains the loop to return.",
    },
  },
  {
    id: "break",
    tab: "It breaks",
    kicker: "One gap is enough",
    title: "And then it breaks",
    paragraphs: [
      "You cannot argue a feeling down while it is cresting, so you do not try. You open a gap somewhere else on the lap. At the thought, you name it as a thought instead of a fact and ask what is actually true. At the response, you do the opposite of what the loop wants, even slightly.",
      "The first few times, the relief is smaller and the feeling lingers longer than you would like. That part is the work. But the loop does not get its usual reward, the groove starts to fade, and each new lap is a little easier to step out of than the one before.",
    ],
    takeaway: "Break in at the thought (test it) or the response (drop the safety move). Repeat, and the groove loosens.",
    lens: {
      thought: "Break in here: name it as a thought, then test what is true.",
      response: "Or here: drop the safety move and do the opposite.",
    },
  },
];
