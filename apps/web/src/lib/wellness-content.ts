// Curated, real video sessions grouped like a wellness library (Calm/Headspace style).
// All youtubeId values are real, embeddable YouTube videos sourced from reputable
// mental-health channels. Durations are approximate.

export interface WellnessVideo {
  id: string;
  title: string;
  minutes: number;
  youtubeId: string;
  source?: string;
}

export interface VideoCategory {
  key: string;
  title: string;
  blurb: string;
  videos: WellnessVideo[];
}

export const VIDEO_CATEGORIES: VideoCategory[] = [
  {
    key: "anxiety",
    title: "Calm anxiety",
    blurb: "CBT-informed skills for working with worry, avoidance, and the anxiety cycle.",
    videos: [
      {
        id: "anx-cycle",
        title: "How to break the anxiety cycle",
        minutes: 8,
        youtubeId: "Kucxlrh74sg",
        source: "Therapy in a Nutshell",
      },
      {
        id: "anx-coping",
        title: "Coping skills for anxiety or depression",
        minutes: 16,
        youtubeId: "aexBCHZxjvw",
        source: "Therapy in a Nutshell",
      },
      {
        id: "anx-problems",
        title: "Solving real problems, not just coping",
        minutes: 12,
        youtubeId: "au1rEhC3vLM",
        source: "Therapy in a Nutshell",
      },
    ],
  },
  {
    key: "ground",
    title: "Ground a hard moment",
    blurb: "Short five-senses exercises to come back to the present during panic or overwhelm.",
    videos: [
      {
        id: "ground-543",
        title: "5-4-3-2-1 grounding for panic and anxiety",
        minutes: 5,
        youtubeId: "pjRMg6KALiw",
      },
      {
        id: "ground-method",
        title: "The 5-4-3-2-1 method, step by step",
        minutes: 4,
        youtubeId: "30VMIEmA114",
      },
    ],
  },
  {
    key: "breathe",
    title: "Breathe",
    blurb: "Follow-along breathwork to slow the body down before a session, message, or sleep.",
    videos: [
      {
        id: "breathe-box",
        title: "Guided box breathing (4-4-4-4)",
        minutes: 5,
        youtubeId: "aPYmZOhJF5Q",
      },
      {
        id: "breathe-anim",
        title: "Box breathing with a visual pacer",
        minutes: 5,
        youtubeId: "FgCe8qmZ6o8",
      },
    ],
  },
  {
    key: "meditate",
    title: "Meditate",
    blurb: "Beginner-friendly guided meditations for attention, stress, and a steadier mind.",
    videos: [
      {
        id: "med-beginner",
        title: "10-minute meditation for complete beginners",
        minutes: 10,
        youtubeId: "S-W1GFBJbt0",
      },
      {
        id: "med-anxiety",
        title: "10-minute meditation for anxiety and stress",
        minutes: 10,
        youtubeId: "4OV4REpHKqw",
      },
      {
        id: "med-clear",
        title: "10-minute meditation to settle the mind",
        minutes: 10,
        youtubeId: "U9YKY7fdwyg",
      },
    ],
  },
  {
    key: "sleep",
    title: "Wind down for sleep",
    blurb: "Longer guided sessions to quiet a busy mind and drift off.",
    videos: [
      {
        id: "sleep-fast",
        title: "Guided meditation to fall asleep in minutes",
        minutes: 20,
        youtubeId: "aRsLJC1Wzoo",
      },
      {
        id: "sleep-deep",
        title: "Sleep talk-down for deep rest",
        minutes: 30,
        youtubeId: "0W3HgzTKcgs",
      },
    ],
  },
  {
    key: "release",
    title: "Release tension",
    blurb: "Progressive muscle relaxation to let physical stress drain out of the body.",
    videos: [
      {
        id: "pmr-full",
        title: "Progressive muscle relaxation, full guide",
        minutes: 11,
        youtubeId: "kNMxuyIEDyg",
      },
      {
        id: "pmr-short",
        title: "5-minute progressive muscle relaxation",
        minutes: 5,
        youtubeId: "5q3K-6HvQIk",
      },
    ],
  },
  {
    key: "understand",
    title: "Understand therapy",
    blurb: "Short explainers on how CBT works, so the work with your therapist makes more sense.",
    videos: [
      {
        id: "cbt-what",
        title: "What is CBT?",
        minutes: 6,
        youtubeId: "ZRijYOJp5e0",
      },
      {
        id: "cbt-help",
        title: "How CBT helps with life's challenges",
        minutes: 4,
        youtubeId: "PsDzxBPET2I",
      },
      {
        id: "cbt-session",
        title: "What a CBT session looks like",
        minutes: 10,
        youtubeId: "8-2WQF3SWwo",
      },
    ],
  },
];
