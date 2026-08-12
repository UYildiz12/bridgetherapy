// Real-life situations that play out through the CBT loop, for the interactive
// workflow in Wellness > Learn. Each one fills the four loop stages.

export interface CbtScenario {
  id: string;
  label: string;
  situation: string;
  thought: string;
  feeling: string;
  response: string;
}

export const CBT_SCENARIOS: CbtScenario[] = [
  {
    id: "manager-text",
    label: "An unread message",
    situation: "A text from your manager: \"Can we talk later?\"",
    thought: "\"I'm in trouble. I've done something wrong.\"",
    feeling: "Anxiety 80/100, tight chest, stomach drop, can't focus.",
    response: "Re-read it ten times, rehearse defenses, put off replying.",
  },
  {
    id: "work-mistake",
    label: "A mistake at work",
    situation: "You sent an email with a typo to the whole team.",
    thought: "\"Everyone thinks I'm careless and unprofessional.\"",
    feeling: "Shame 75/100, hot face, the urge to disappear.",
    response: "Over-apologize, replay it all evening, avoid the group chat.",
  },
  {
    id: "social-plans",
    label: "Plans with people",
    situation: "You're invited somewhere you won't know many people.",
    thought: "\"I'll have nothing to say and come across as awkward.\"",
    feeling: "Dread 70/100, restless, a knot in the stomach.",
    response: "Make an excuse and cancel; relief now, regret later.",
  },
  {
    id: "health-worry",
    label: "A body sensation",
    situation: "You notice your heart racing for no clear reason.",
    thought: "\"Something is seriously wrong with me.\"",
    feeling: "Fear 85/100, heart races more, hyper-aware of the body.",
    response: "Check your pulse over and over, search symptoms, avoid exertion.",
  },
];
