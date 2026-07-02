"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
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
      desc: "A steady workspace for your mind: track your mood, capture reflections, and stay connected with your therapist.",
      panelHeader: "Today's Plan",
      rituals: [
        { label: "Morning Check-in", time: "2 min", done: true },
        { label: "Mood Log", time: "1 min", done: true },
        { label: "Therapy Session", time: "50 min", active: true },
        { label: "Evening Reflection", time: "10 min", done: false },
      ] as Ritual[],
    },
    valuesTitle: "What you get",
    values: [
      {
        title: "Track your mood",
        desc: "Log how you feel in seconds. Patterns surface over time, so progress stops being a mystery and starts being visible.",
      },
      { title: "Reflect with clarity", desc: "A private-feeling space to notice situations, thoughts, feelings, and recurring themes." },
      { title: "Stay connected", desc: "Share what matters with your therapist between sessions, securely." },
    ] as ValueProp[],
    howItWorks: [
      { title: "Connect", desc: "Invite your current therapist into Exhale, or complete the intake to find a CBT therapist who fits your needs." },
      { title: "Engage", desc: "Work through CBT homework sets and daily check-ins your therapist assigns." },
      { title: "Grow", desc: "Track your trends and bring clearer patterns into the next session." },
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
        { label: "Notes Review", time: "11:00", active: true },
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
      { title: "Build", desc: "Build flexible CBT homework sets from worksheets, readings, or anything." },
      { title: "Focus", desc: "Structured notes and suggested homework after every session." },
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
    // Connect: use Exhale with your therapist, or find a CBT-first match.
    <>
      <div className="ps-head">Set up your therapy workspace</div>
      <div className="ps-prefs">
        <span className="on">Already have a therapist</span>
        <span>Find a CBT match</span>
      </div>
      <div className="ps-sub ps-why-head">
        <Sparkles size={11} strokeWidth={2} />
        Two ways to start
      </div>
      <ul className="ps-matches">
        <li>
          <span className="ps-avatar sm" />
          <div className="ps-mt">
            <div className="ps-name">Invite your therapist</div>
            <div className="ps-role">Use Exhale with your current therapist</div>
            <div className="ps-why">Share reflections, homework, and check-ins with the therapist you already trust.</div>
          </div>
        </li>
        <li>
          <span className="ps-avatar sm" />
          <div className="ps-mt">
            <div className="ps-name">Find a CBT match</div>
            <div className="ps-role">Guided intake when you need someone new</div>
            <div className="ps-why">Tell us your needs and choose from therapists matched to your goals and schedule.</div>
          </div>
        </li>
        <li>
          <span className="ps-avatar sm" />
          <div className="ps-mt">
            <div className="ps-name">Keep one workspace</div>
            <div className="ps-role">Notes, mood, messages, sessions</div>
            <div className="ps-why">Your between-session work stays organized either way.</div>
          </div>
        </li>
      </ul>
    </>,
    // Engage: doing an assigned CBT homework set
    <>
      <div className="ps-head">This week&apos;s homework</div>
      <div className="ps-set">
        <div className="ps-set-name">Cognitive restructuring</div>
        <div className="ps-set-meta">From Dr. Okafor · 2 of 3 done</div>
        <div className="ps-progress">
          <span style={{ width: "66%" }} />
        </div>
      </div>
      <ul className="ps-tasks">
        <li className="done">
          <span className="ps-box">
            <Check size={11} strokeWidth={3} />
          </span>
          Thought record
        </li>
        <li className="done">
          <span className="ps-box">
            <Check size={11} strokeWidth={3} />
          </span>
          4-7-8 breathing
        </li>
        <li>
          <span className="ps-box" />
          Behavioral activation: a short walk
        </li>
      </ul>
      <div className="ps-actions">
        <span className="ps-btn">Add note</span>
        <span className="ps-btn primary">Open set</span>
      </div>
    </>,
    // Grow: progress + the Lumen AI companion nudge
    <>
      <div className="ps-head">Your progress</div>
      <div className="ps-stats">
        <div>
          <strong className="ps-trend">+18%</strong>
          <span>calmer this week</span>
        </div>
        <div>
          <strong>7</strong>
          <span>day streak</span>
        </div>
      </div>
      <div className="ps-sub">Mood · last 7 days</div>
      <div className="ps-bars sm">
        {[4, 6, 5, 7, 6, 8, 7].map((h, n) => (
          <span key={n} style={{ height: `${h * 8}px` }} />
        ))}
      </div>
      <div className="ps-bot">
        <div className="ps-bot-head">
          <Sparkles size={13} strokeWidth={2} />
          Lumen
        </div>
        <p className="ps-bot-msg">
          Last session, Dr. Okafor suggested noting your thoughts when you head out. Want to try a
          quick thought record today?
        </p>
        <span className="ps-btn primary ps-bot-cta">Start now</span>
      </div>
    </>,
  ],
  therapist: [
    // Onboard: a real client roster with status
    <>
      <div className="ps-head">Your clients</div>
      <ul className="ps-matches">
        <li>
          <span className="ps-avatar sm" />
          <div className="ps-mt">
            <div className="ps-name">Jada P.</div>
            <div className="ps-role">Cognitive restructuring · Wk 2</div>
          </div>
          <span className="ps-pct">On track</span>
        </li>
        <li>
          <span className="ps-avatar sm" />
          <div className="ps-mt">
            <div className="ps-name">Marcus T.</div>
            <div className="ps-role">Behavioral activation</div>
          </div>
          <span className="ps-pct">2 due</span>
        </li>
        <li>
          <span className="ps-avatar sm" />
          <div className="ps-mt">
            <div className="ps-name">New intake</div>
            <div className="ps-role">Awaiting review</div>
          </div>
          <span className="ps-pct">New</span>
        </li>
      </ul>
      <div className="ps-actions">
        <span className="ps-btn primary">Add client</span>
      </div>
    </>,
    // Build: a flexible homework-set builder (items can be anything)
    <>
      <div className="ps-head">New homework set</div>
      <div className="ps-field">
        Cognitive restructuring
        <span className="ps-caret" />
      </div>
      <ul className="ps-builder">
        <li>
          <span className="ps-itype">Worksheet</span>Thought record
        </li>
        <li>
          <span className="ps-itype">Reading</span>Cognitive distortions
        </li>
        <li>
          <span className="ps-itype">Voice</span>Daily reflection
        </li>
        <li className="add">
          <span className="ps-box plus">+</span>Add any item
        </li>
      </ul>
      <div className="ps-actions">
        <span className="ps-btn">Save draft</span>
        <span className="ps-btn primary">Assign</span>
      </div>
    </>,
    // Focus: drafted notes + suggested homework
    <>
      <div className="ps-head">Session summary</div>
      <div className="ps-note">Drafted notes ready. Suggested: assign a thought-record set this week.</div>
      <ul className="ps-tasks">
        <li className="done">
          <span className="ps-box">
            <Check size={11} strokeWidth={3} />
          </span>
          SOAP note drafted
        </li>
        <li className="done">
          <span className="ps-box">
            <Check size={11} strokeWidth={3} />
          </span>
          Homework suggested
        </li>
      </ul>
      <div className="ps-actions">
        <span className="ps-btn">Edit</span>
        <span className="ps-btn primary">Review &amp; send</span>
      </div>
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
  const [role, setRole] = useState<Role>("patient");
  const heroVisualRef = useRef<HTMLDivElement>(null);

  const t = content[role];
  const [rituals, setRituals] = useState<Ritual[]>(t.hero.rituals);
  const nextRitualIndex = rituals.findIndex((r) => !r.done);
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  // Returning users with a live session get "Open app" instead of the sign-in CTA.
  useEffect(() => {
    let cancelled = false;
    import("@/lib/supabase/client")
      .then(({ createSupabaseBrowserClient }) =>
        createSupabaseBrowserClient().auth.getSession(),
      )
      .then(({ data }) => {
        if (!cancelled && data.session) setSignedIn(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const signupHref = `/signup?role=${role}`;

  const chooseRole = (nextRole: Role) => {
    setRole(nextRole);
    setRituals(content[nextRole].hero.rituals);
    setActiveStep(0);
  };

  // Sync the phone to the step nearest a target line: viewport center on desktop,
  // and lower on mobile (~78%) so the active step sits in the visible band BELOW the
  // pinned phone rather than behind it.
  useEffect(() => {
    const pickActive = () => {
      const isMobile = window.matchMedia("(max-width: 860px)").matches;
      if (isMobile) {
        // The phone is pinned at the top. The active step is the topmost one still
        // peeking out below it, so as soon as a step tucks behind the phone the next
        // one takes over (rather than waiting for that next step to reach behind it).
        const phone = document.querySelector(".how-phone-wrap");
        const phoneBottom = phone
          ? phone.getBoundingClientRect().bottom
          : window.innerHeight * 0.6;
        let best = stepRefs.current.length - 1;
        for (let i = 0; i < stepRefs.current.length; i++) {
          const el = stepRefs.current[i];
          if (el && el.getBoundingClientRect().bottom > phoneBottom + 40) {
            best = i;
            break;
          }
        }
        setActiveStep(best);
        return;
      }
      const targetY = window.innerHeight * 0.5;
      let best = 0;
      let bestDist = Infinity;
      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - targetY);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveStep(best);
    };
    pickActive();
    window.addEventListener("scroll", pickActive, { passive: true });
    window.addEventListener("resize", pickActive);
    return () => {
      window.removeEventListener("scroll", pickActive);
      window.removeEventListener("resize", pickActive);
    };
  }, [role]);

  const toggleRitual = (index: number) => {
    setRituals((prev) => prev.map((r, i) => (i === index ? { ...r, done: !r.done } : r)));
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
    <div className="landing-page" data-theme="dark">
      <BlueprintSvg />
      <BlueprintSecondarySvg />

      <div className="page">
        <nav className="nav">
          <div className="logo">
            <span className="logo-badge"></span>
            exhale
            <span className="ml-3 hidden text-[10px] tracking-widest text-white/70 uppercase border border-white/10 px-2 py-0.5 rounded-full sm:inline-block">
              {t.badge}
            </span>
          </div>
          <div className="nav-actions">
            <div className="flex bg-white/5 border border-white/10 rounded-full p-1 mr-1">
              <button
                onClick={() => chooseRole("patient")}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full transition-all ${role === "patient" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
              >
                Patient
              </button>
              <button
                onClick={() => chooseRole("therapist")}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full transition-all ${role === "therapist" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
              >
                Therapist
              </button>
            </div>
            <Link href={signedIn ? "/dashboard" : "/login"} className="nav-login no-underline">
              {signedIn ? "Open app" : "Sign in / Register"}
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

        <section id="features" className="section reveal value-section">
          <h2 className="section-title">{t.valuesTitle}</h2>
          <svg className="draw-line" viewBox="0 0 260 8" fill="none" aria-hidden="true">
            <path d="M1 5 H 259" pathLength={1} />
          </svg>
          <div className="value-list" key={role}>
            {t.values.map((v, i) => (
              <div
                className="value-row"
                key={`${role}-${i}`}
                style={{ "--i": i } as React.CSSProperties}
              >
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
                  role="button"
                  tabIndex={0}
                  aria-pressed={activeStep === i}
                  onMouseEnter={() => setActiveStep(i)}
                  onClick={() => setActiveStep(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveStep(i);
                    }
                  }}
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
