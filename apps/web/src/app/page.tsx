"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { BlueprintSvg } from "@/components/landing/blueprint-svg";
import { BlueprintSecondarySvg } from "@/components/landing/blueprint-secondary-svg";

type Role = "patient" | "therapist";

interface Ritual {
  label: string;
  time: string;
  done?: boolean;
  active?: boolean;
}

interface ValueProp {
  title: string;
  desc: string;
}

const content = {
  patient: {
    badge: "Patient",
    hero: {
      title: "mental health, clarified.",
      desc: "An intelligent workspace for your mind: track your mood, journal with AI insights, and stay connected with your therapist.",
      panelHeader: "Today's Plan",
      rituals: [
        { label: "Morning Check-in", time: "2 min", done: true },
        { label: "Mood Log", time: "1 min", done: true },
        { label: "Therapy Session", time: "50 min", active: true },
        { label: "Evening Journal", time: "10 min", done: false },
      ] as Ritual[],
    },
    valuesTitle: "What you get",
    values: [
      {
        title: "Track your mood",
        desc: "Log how you feel in seconds. Patterns surface over time, so progress stops being a mystery and starts being visible.",
      },
      { title: "Journal with clarity", desc: "A private space to reflect, with gentle prompts that reveal recurring themes." },
      { title: "Stay connected", desc: "Share what matters with your therapist between sessions, securely." },
    ] as ValueProp[],
    howItWorks: [
      { title: "Match", desc: "Answer a few questions and meet a therapist who fits your needs." },
      { title: "Engage", desc: "Start a simple daily plan: check in, log your mood, and journal." },
      { title: "Grow", desc: "Watch your trends and mark progress alongside your therapist." },
    ],
    cta: {
      title: "Begin with clarity.",
      desc: "Steady, focused support for the everyday. Start with a one-minute check-in.",
    },
  },
  therapist: {
    badge: "Therapist",
    hero: {
      title: "practice designed for deep work.",
      desc: "Automate intake, notes, and scheduling so you can focus entirely on the session. Your practice, clarified.",
      panelHeader: "Today's Flow",
      rituals: [
        { label: "Review: Jada P.", time: "09:00", done: true },
        { label: "Session: Marcus T.", time: "10:00", done: true },
        { label: "Notes & Billing", time: "11:00", active: true },
        { label: "Group Session", time: "14:00", done: false },
      ] as Ritual[],
    },
    valuesTitle: "How it helps",
    values: [
      {
        title: "Less paperwork",
        desc: "Structured session notes and summaries drafted for you, so you can stay present instead of writing.",
      },
      { title: "Know what's happening", desc: "See mood trends and flags between sessions, and reach out at the right moment." },
      { title: "Everything in one place", desc: "Notes, messages, and history for each client in one continuous timeline." },
    ] as ValueProp[],
    howItWorks: [
      { title: "Onboard", desc: "Import existing clients or open slots for new matches." },
      { title: "Automate", desc: "Set your availability and let scheduling and reminders run themselves." },
      { title: "Focus", desc: "Use session insights and drafted notes to do better work with less effort." },
    ],
    cta: {
      title: "Upgrade your practice.",
      desc: "Do the work you love without the burnout. Run a modern, quiet practice.",
    },
  },
};

// Blueprint vignettes shown on the phone, one per step, swapped as the active step changes.
const phoneScreens: Record<Role, React.ReactNode[]> = {
  patient: [
    <>
      <div className="ps-head">Your match</div>
      <div className="ps-match">
        <span className="ps-avatar" />
        <div>
          <div className="ps-name">Dr. Amara Okafor</div>
          <div className="ps-role">Licensed therapist</div>
        </div>
      </div>
      <div className="ps-tags">
        <span>Anxiety</span>
        <span>CBT</span>
        <span>Sleep</span>
      </div>
      <span className="ps-chip">Matched</span>
    </>,
    <>
      <div className="ps-head">Today's check-in</div>
      <div className="ps-scale">
        {Array.from({ length: 10 }).map((_, n) => (
          <span key={n} className={n === 6 ? "on" : ""} />
        ))}
      </div>
      <div className="ps-sub">Mood logged · 7 / 10</div>
      <ul className="ps-rows">
        <li><span className="ps-dot on" />Morning check-in</li>
        <li><span className="ps-dot" />Evening journal</li>
      </ul>
    </>,
    <>
      <div className="ps-head">7-day trend</div>
      <div className="ps-bars">
        {[4, 6, 5, 7, 6, 8, 7].map((h, n) => (
          <span key={n} style={{ height: `${h * 11}px` }} />
        ))}
      </div>
      <div className="ps-sub">Trending up this week</div>
    </>,
  ],
  therapist: [
    <>
      <div className="ps-head">Your clients</div>
      <ul className="ps-rows">
        <li><span className="ps-dot on" />Jada P.</li>
        <li><span className="ps-dot on" />Marcus T.</li>
        <li><span className="ps-dot" />New intake</li>
      </ul>
    </>,
    <>
      <div className="ps-head">This week</div>
      <div className="ps-slots">
        <span className="filled">Mon 10:00</span>
        <span>Mon 14:00</span>
        <span className="filled">Tue 09:00</span>
        <span>Wed 11:00</span>
      </div>
      <div className="ps-sub">Auto-scheduled with breaks</div>
    </>,
    <>
      <div className="ps-head">Session summary</div>
      <div className="ps-note">Drafted notes ready to review. Two follow-ups suggested for next week.</div>
      <ul className="ps-rows">
        <li><span className="ps-dot on" />SOAP note</li>
        <li><span className="ps-dot on" />Next steps</li>
      </ul>
    </>,
  ],
};

function PhoneScreen({ role, step }: { role: Role; step: number }) {
  return (
    <div className="phone-screen-inner" key={`${role}-${step}`}>
      {phoneScreens[role][step]}
    </div>
  );
}

export default function Home() {
  const [isLight, setIsLight] = useState(false);
  const [role, setRole] = useState<Role>("patient");
  const heroVisualRef = useRef<HTMLDivElement>(null);

  const t = content[role];
  const [rituals, setRituals] = useState<Ritual[]>(t.hero.rituals);
  const nextRitualIndex = rituals.findIndex((r) => !r.done);
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  const signupHref = `/signup?role=${role}`;

  useEffect(() => {
    setRituals(content[role].hero.rituals);
    setActiveStep(0);
  }, [role]);

  // Sync the phone screen to whichever step is nearest the viewport center.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.step);
            if (!Number.isNaN(idx)) setActiveStep(idx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [role]);

  const toggleRitual = (index: number) => {
    setRituals((prev) => prev.map((r, i) => (i === index ? { ...r, done: !r.done } : r)));
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem("exhale-theme");
    if (storedTheme === "light") setIsLight(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isLight;
    setIsLight(newTheme);
    localStorage.setItem("exhale-theme", newTheme ? "light" : "dark");
  };

  // Scroll reveal: re-observe when role changes so new copy animates in.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [role]);

  // Hero visual mouse-tilt: motion that responds to the reader, not a loop.
  useEffect(() => {
    const visual = heroVisualRef.current;
    if (!visual) return;
    const onMove = (event: MouseEvent) => {
      const rect = visual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      visual.style.setProperty("--tilt-x", `${x * 6}deg`);
      visual.style.setProperty("--tilt-y", `${-y * 6}deg`);
    };
    const onLeave = () => {
      visual.style.setProperty("--tilt-x", "0deg");
      visual.style.setProperty("--tilt-y", "0deg");
    };
    visual.addEventListener("mousemove", onMove);
    visual.addEventListener("mouseleave", onLeave);
    return () => {
      visual.removeEventListener("mousemove", onMove);
      visual.removeEventListener("mouseleave", onLeave);
    };
  }, [role]);

  return (
    <div className="landing-page" data-theme={isLight ? "light" : "dark"}>
      <BlueprintSvg />
      <BlueprintSecondarySvg />

      <div className="page">
        <nav className="nav">
          <div className="logo">
            <span className="logo-badge"></span>
            exhale
            <span className="ml-3 text-[10px] tracking-widest text-muted-foreground uppercase border border-white/10 px-2 py-0.5 rounded-full">
              {t.badge}
            </span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
          </div>
          <div className="nav-actions">
            <div className="flex bg-white/5 border border-white/10 rounded-full p-1 mr-1">
              <button
                onClick={() => setRole("patient")}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full transition-all ${role === "patient" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}
              >
                Patient
              </button>
              <button
                onClick={() => setRole("therapist")}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full transition-all ${role === "therapist" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}
              >
                Therapist
              </button>
            </div>
            <button className="theme-toggle" type="button" aria-pressed={isLight} onClick={toggleTheme}>
              {isLight ? "Dark" : "Light"}
            </button>
            <Link href="/login" className="nav-login no-underline">
              Log in
            </Link>
            <Link href={signupHref} className="cta-button no-underline flex items-center">
              Get Started
            </Link>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-copy stagger" key={role}>
            <h1>
              <span className="exhale-word accent">Exhale</span>: {t.hero.title}
            </h1>
            <p>{t.hero.desc}</p>
            <div className="hero-actions">
              <Link href={signupHref} className="cta-button no-underline flex items-center">
                Get Started
              </Link>
              <a href="#how" className="ghost-button no-underline flex items-center">
                See how it works
              </a>
            </div>
          </div>
          <div className="hero-visual" ref={heroVisualRef}>
            <div className="orb">
              <span className="orb-ring ring-one"></span>
              <span className="orb-ring ring-two"></span>
              <span className="orb-dot"></span>
            </div>
            <div className="card-stack">
              <div className="ritual-panel">
                <div className="ritual-header">
                  {t.hero.panelHeader}
                </div>
                <ul className="ritual-list">
                  {rituals.map((r, i) => (
                    <li
                      className={`ritual-item ${r.done ? "done" : ""} ${i === nextRitualIndex ? "next-item" : ""}`}
                      key={i}
                      onClick={() => toggleRitual(i)}
                    >
                      <span className="label">
                        <span className="dot"></span>
                        <span className="text">{r.label}</span>
                      </span>
                      <span className="time">{r.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section reveal">
          <h2 className="section-title">{t.valuesTitle}</h2>
          <div className="value-list" key={role}>
            {t.values.map((v, i) => (
              <div className="value-row" key={`${role}-${i}`}>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="section reveal">
          <h2 className="section-title">How it works</h2>
          <div className="how-grid">
            <div className="how-steps">
              {t.howItWorks.map((s, i) => (
                <div
                  className={`how-step ${activeStep === i ? "active" : ""}`}
                  key={`${role}-${i}`}
                  data-step={i}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  onMouseEnter={() => setActiveStep(i)}
                >
                  <span className="how-num">0{i + 1}</span>
                  <div className="how-step-body">
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="how-phone-wrap" aria-hidden="true">
              <div className="phone">
                <div className="phone-screen">
                  <PhoneScreen role={role} step={activeStep} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal">
          <div className="cta-panel">
            <span className="cta-orb" aria-hidden="true" />
            <h2>{t.cta.title}</h2>
            <p>{t.cta.desc}</p>
            <Link href={signupHref} className="cta-button cta-button--lg no-underline">
              Get Started
            </Link>
          </div>
        </section>

        <footer>
          <div>Exhale © 2026</div>
          <div className="footer-links">
            <a href="mailto:hello@exhale.com">hello@exhale.com</a>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
