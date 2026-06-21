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

const content = {
  patient: {
    nav: { cta: "Get Started", badge: "Patient" },
    hero: {
      title: "mental health, clarified.",
      axis: "Daily Flow",
      desc: "An intelligent workspace for your mind. Track mood, journal with AI insights, and connect with your therapist—all in one place.",
      cta: "Start Ritual",
      secondaryCta: "See Demo",
      panelHeader: "Today's Plan",
      rituals: [
        { label: "Morning Check-in", time: "2 min", done: true },
        { label: "Mood Log", time: "1 min", done: true },
        { label: "Therapy Session", time: "50 min", active: true },
        { label: "Evening Journal", time: "10 min", done: false },
      ] as Ritual[],
    },
    approach: {
      title: "Data-driven care, human connection.",
      subtitle: "Exhale bridges the gap between sessions. Your progress isn't a mystery—it's visible, understandable, and actionable.",
      cards: [
        { title: "Smart Journaling", desc: "Your private space for reflection is enhanced by on-device AI that detects patterns in your entries. Over time, it highlights recurring themes and emotional shifts, helping you understand your own narrative without compromising privacy." },
        { title: "Mood Analytics", desc: "Track your emotional landscape with granular precision using our clinically-validated mood spectrum. Visualize your highs and lows on a timeline to correlate them with life events, sleep quality, and therapy sessions." },
        { title: "Secure Connection", desc: "Experience true privacy with HIPAA-compliant, end-to-end encrypted video and messaging. Whether you're in a session or sending a quick update, your communication is locked down and visible only to you and your provider." },
        { title: "Daily Focus", desc: "Start every morning with intention. Based on your recent journals and therapy goals, Exhale generates a personalized focus prompt to ground you for the day ahead, helping you stay aligned with your growth journey." },
        { title: "Sleep Tracking", desc: "Integrate seamlessly with Apple HealthKit or Google Fit to correlate your rest with your resilience. See clearly how your sleep quality impacts your mood the next day, and get tailored suggestions for better hygiene." },
        { title: "Meditation Library", desc: "Access a curated library of over 500 evidence-based audio sessions. From 5-minute anxiety reducers to deep sleep nidras, discover practices designed by clinical experts to regulate your nervous system." },
        { title: "Breathwork", desc: "Regulate your autonomic nervous system in real-time with visual breathing guides. Use 'Box Breathing' for focus, '4-7-8' for sleep, or 'Physiological Sighs' for immediate stress relief, all accessible with a single tap." },
        { title: "Crisis Support", desc: "Safety is paramount. Get immediate, one-tap access to your personalized safety plan and crisis lifelines. Share your location with trusted contacts or connect instantly to emergency services when you need support the most." },
        { title: "Medication Reminders", desc: "Reduce the cognitive load of your treatment plan with discreet, customizable reminders. Track adherence over time and share logs with your psychiatrist to fine-tune your dosage and minimize side effects." },
        { title: "Family Systems", desc: "Map out the complex web of relationships in your life. visual genograms help you and your therapist identify generational patterns, alliance structures, and relational dynamics that influence your wellbeing." },
        { title: "Progress Timeline", desc: "Celebrate your journey with a beautiful, scrolling timeline of your milestones. See how far you've come by reviewing past insights, completed goals, and growth markers in a visual format that honors your hard work." },
        { title: "Export Data", desc: "Your data belongs to you, always. With a single click, export your entire history—journals, mood logs, and insights—into a secure PDF or JSON format for your own records or to share with a new provider." },
      ],
    },
    features: {
      title: "Core Values.",
      subtitle: "Technology built on trust, privacy, and clinical precision.",
      cards: [
        { title: "Insightful", desc: "AI-generated reflections that help you spot patterns, but never replace human intuition." },
        { title: "Ethical", desc: "Your data is yours. No information that you didn't explicitly want shared is ever shared." },
        { title: "Secure", desc: "Enterprise-grade encryption and biometric locks keep your deepest thoughts strictly private." },
        { title: "Customized", desc: "Receive homework and rituals that are specific to your unique workflow and needs." },
      ],
    },
    howItWorks: {
      steps: [
        { title: "Match", desc: "Answer a few questions and get matched with a specialist who fits your needs." },
        { title: "Engage", desc: "Start your daily plan: Check-in, journal, and prepare for your first session." },
        { title: "Grow", desc: "Track your mood trends and celebrate milestones with your therapist." },
      ],
    },
    pricing: {
      title: "Pricing with room to grow",
      subtitle: "Transparent plans with therapist access, rituals, and progress insights.",
      tiers: [
        { name: "Starter", price: "$39 / mo", features: ["Weekly therapist message", "3 guided rituals", "Progress reflections"] },
        { name: "Core", price: "$79 / mo", features: ["Unlimited rituals", "Biweekly live sessions", "Personalized nervous system map"], highlight: true },
        { name: "Deep Care", price: "$129 / mo", features: ["Weekly live sessions", "Voice note access", "Therapist-led plans"] },
      ],
    },
    cta: {
      title: "Begin with clarity.",
      desc: "Exhale is designed to help you steady, focus, and feel supported every day. Start a session and meet a therapist who keeps it clear.",
      btn: "Start today",
    },
  },
  therapist: {
    nav: { cta: "Join Practice", badge: "Therapist" },
    hero: {
      title: "practice designed for deep work.",
      axis: "Workflow Flow",
      desc: "Manage less, heal more. Automate intake, notes, and scheduling so you can focus entirely on the session. Your practice, clarified.",
      cta: "Start Practice",
      secondaryCta: "See Features",
      panelHeader: "Today's Flow",
      rituals: [
        { label: "Review: Jada P.", time: "09:00", done: true },
        { label: "Session: Marcus T.", time: "10:00", done: true },
        { label: "Notes & Billing", time: "11:00", active: true },
        { label: "Group Session", time: "14:00", done: false },
      ] as Ritual[],
    },
    approach: {
      title: "A system that respects your craft.",
      subtitle: "Exhale handles the noise. Intelligent tooling for documentation, scheduling, and client insights.",
      cards: [
        { title: "Auto-Documentation", desc: "Focus entirely on your client while our secure ambient intelligence captures session context. It automatically generates structured SOAP notes, clinical summaries, and CPT coding suggestions in seconds, saving you hours of admin work." },
        { title: "Client Radar", desc: "Stay informed between sessions with a real-time dashboard. Receive smart alerts when a client's mood drops significantly or when specific keywords appear in their journals, allowing for proactive, timely check-ins." },
        { title: "Unified Stream", desc: "Ditch the tab-switching fatigue. Chat, secure video, document sharing, and clinical notes all live in a single, continuous timeline for each client, giving you a complete contextual history at a glance." },
        { title: "Smart Scheduling", desc: "Reclaim your energy with a calendar that works for you. Our intelligent scheduler optimizes your day to prevent burnout, automatically enforcing gaps between intensive sessions and clustering admin time." },
        { title: "Billing & Invoices", desc: "Get paid on time without the awkward conversations. Automated Superbill generation and striped payment integration ensure invoices are sent and settled instantly after every session." },
        { title: "Insurance Claims", desc: "Navigate the reimbursement maze with ease. Submit claims with a single click, track their status in real-time, and get automated alerts for denials or required resubmissions, reducing revenue leakage." },
        { title: "Secure Messaging", desc: "Maintain healthy boundaries with a dedicated, secure channel. Set automated out-of-office replies, schedule messages for business hours, and keep your personal phone number completely private." },
        { title: "Resource Library", desc: "Empower your clients with the right tools at the right time. Instantly send worksheets, psychoeducation videos, and coping articles from our clinically-vetted library directly to their client portal." },
        { title: "Supervision Chat", desc: "Never practice in isolation. Connect with your consultation group in secure, anonymized channels to discuss difficult cases, share resources, and get peer support in a protected environment." },
        { title: "Outcome Measures", desc: "Track clinical progress objectively. Automatically dispatch standard measures like GAD-7 and PHQ-9 at set intervals, and view the results in longitudinal graphs that demonstrate efficacy to clients and payers." },
        { title: "Custom Forms", desc: "Streamline your intake process with a powerful drag-and-drop form builder. Create custom questionnaires, consent forms, and assessments that clients can complete digitally before their first appointment." },
        { title: "Practice Analytics", desc: "Treat your practice like the business it is. Visual dashboards help you understand detailed metrics on client retention, revenue per session, referral sources, and clinical outcomes." },
      ],
    },
    features: {
      title: "Practice Pillars.",
      subtitle: "Everything you need to run a modern, efficient therapy practice.",
      cards: [
        { title: "Insightful", desc: "AI-driven clinical summaries that highlight progress markers you might miss." },
        { title: "Ethical", desc: "Built-in safeguards ensure AI never oversteps. You always have the final say." },
        { title: "Secure", desc: "HIPAA-compliant infrastructure with biometric access control for sensitive notes." },
        { title: "Customized", desc: "Create and assign custom homework workflows specific to your treatment modalities." },
      ],
    },
    howItWorks: {
      steps: [
        { title: "Onboard", desc: "Import your existing clients or open slots for new matches." },
        { title: "Automate", desc: "Set your availability and let the system handle bookings and reminders." },
        { title: "Focus", desc: "Use session insights and AI notes to deliver better care with less effort." },
      ],
    },
    pricing: {
      title: "Simple practice pricing",
      subtitle: "One subscription for your entire clinical operating system.",
      tiers: [
        { name: "Solo", price: "$29 / mo", features: ["Up to 10 clients", "Basic AI Notes", "Scheduling & Billing"] },
        { name: "Professional", price: "$79 / mo", features: ["Unlimited clients", "Advanced AI Insights", "Custom Forms"], highlight: true },
        { name: "Group", price: "$199 / mo", features: ["Multi-provider support", "Practice Analytics", "Admin roles"] },
      ],
    },
    cta: {
      title: "Upgrade your practice.",
      desc: "Exhale is designed to let you do the work you love without the burnout. Join the network of modern therapists.",
      btn: "Join Now",
    },
  },
};

export default function Home() {
  const [isLight, setIsLight] = useState(false);
  const [role, setRole] = useState<Role>("patient");
  const [activeFeature, setActiveFeature] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const heroVisualRef = useRef<HTMLDivElement>(null);
  const featureListRef = useRef<HTMLDivElement>(null);

  const t = content[role];

  // Initialize rituals state from content
  const [rituals, setRituals] = useState<Ritual[]>(t.hero.rituals);

  // Find first unchecked item for "Glow" effect
  const nextRitualIndex = rituals.findIndex(r => !r.done);

  // Update rituals when role changes
  useEffect(() => {
    setRituals(content[role].hero.rituals as Ritual[]);
  }, [role]);

  const toggleRitual = (index: number) => {
    setRituals(prev => prev.map((r, i) => i === index ? { ...r, done: !r.done } : r));
  };

  useEffect(() => {
    // Auto-advance features every 7 seconds
    const interval = setInterval(() => {
      if (!isPaused) {
        setActiveFeature((prev) => (prev + 1) % t.approach.cards.length);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [role, t.approach.cards.length, isPaused]); // Reset if role or pause state changes

  useEffect(() => {
    // Auto-scroll to active item
    if (featureListRef.current) {
      const activeEl = document.getElementById(`feature-item-${activeFeature}`);
      if (activeEl) {
        // Smooth scroll to element
        const container = featureListRef.current;
        const offset = activeEl.offsetTop - container.offsetTop;
        container.scrollTo({ top: offset - 20, behavior: 'smooth' });
      }
    }
  }, [activeFeature]);

  useEffect(() => {
    // Theme initialization
    const storedTheme = localStorage.getItem("exhale-theme");
    if (storedTheme === "light") {
      setIsLight(true);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isLight;
    setIsLight(newTheme);
    localStorage.setItem("exhale-theme", newTheme ? "light" : "dark");
  };

  useEffect(() => {
    // Scroll Reveal Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.1 }
    );

    const revealEls = document.querySelectorAll(".reveal");
    revealEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [role]); // Re-run when role changes to catch new elements

  useEffect(() => {
    // Mouse Tilt Effect
    const visual = heroVisualRef.current;
    if (!visual) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = visual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      visual.style.setProperty("--tilt-x", `${x * 5}deg`);
      visual.style.setProperty("--tilt-y", `${-y * 5}deg`);
    };

    const handleMouseLeave = () => {
      visual.style.setProperty("--tilt-x", "0deg");
      visual.style.setProperty("--tilt-y", "0deg");
    };

    visual.addEventListener("mousemove", handleMouseMove);
    visual.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      visual.removeEventListener("mousemove", handleMouseMove);
      visual.removeEventListener("mouseleave", handleMouseLeave);
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
              {t.nav.badge}
            </span>
          </div>
          <div className="nav-links">
            <a href="#approach">Approach</a>
            <a href="#modes">Features</a>
            <a href="#stories">Stories</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-actions">
            <div className="flex bg-white/5 border border-white/10 rounded-full p-1 mr-2">
              <button
                onClick={() => setRole("patient")}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full transition-all ${role === "patient" ? "bg-white text-black" : "text-gray-400 hover:text-white"
                  }`}
              >
                Patient
              </button>
              <button
                onClick={() => setRole("therapist")}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full transition-all ${role === "therapist" ? "bg-white text-black" : "text-gray-400 hover:text-white"
                  }`}
              >
                Therapist
              </button>
            </div>
            <button
              className="theme-toggle"
              type="button"
              aria-pressed={isLight}
              onClick={toggleTheme}
            >
              {isLight ? "Dark" : "Light"}
            </button>
            <Link
              href="/login"
              className="no-underline text-[11px] uppercase tracking-[0.22em] text-gray-400 hover:text-white transition-colors px-2"
            >
              Log in
            </Link>
            <Link href={`/signup?role=${role}`} className="cta-button no-underline flex items-center">
              {t.nav.cta}
            </Link>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-copy stagger" key={role}>
            <h1>
              <span className="exhale-word accent">Exhale</span> — {t.hero.title}
            </h1>
            <div className="flow-axis">{t.hero.axis}</div>
            <p>{t.hero.desc}</p>
            <div className="hero-actions">
              <Link href={`/signup?role=${role}`} className="cta-button no-underline flex items-center">
                {t.hero.cta}
              </Link>
              <a href="#approach" className="ghost-button no-underline flex items-center">
                {t.hero.secondaryCta}
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
                  <span className="chip">Today</span>
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

        <section id="approach" className="section reveal">
          <h2 className="section-title">{t.approach.title}</h2>
          <p className="section-subtitle">{t.approach.subtitle}</p>
          <div
            className="interactive-features"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="feature-list" ref={featureListRef}>
              {t.approach.cards.map((c, i) => (
                <div
                  key={i}
                  id={`feature-item-${i}`}
                  className={`feature-item ${activeFeature === i ? "active" : ""}`}
                  onClick={() => setActiveFeature(i)}
                >
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
            <div className="feature-detail-wrapper">
              <div className="feature-detail" key={activeFeature}>
                <div className={`detail-visual ${activeFeature % 3 === 0 ? "lines" : activeFeature % 3 === 1 ? "waves" : "dots"}`}></div>
                <h3>{t.approach.cards[activeFeature].title}</h3>
                <p>{t.approach.cards[activeFeature].desc}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal" id="modes">
          <h2 className="section-title">{t.features.title}</h2>
          <p className="section-subtitle">{t.features.subtitle}</p>
          <div className="grid">
            {t.features.cards.map((c, i) => (
              <article className={`tile tile-fold mode-card box-reveal box-reveal--grid box-reveal--silent ${i === 0 ? "box-reveal--cornerflip" : i === 1 ? "box-reveal--ticks" : i === 2 ? "box-reveal--angle" : "box-reveal--offset"}`} key={i}>
                <div className="tile-fold-inner">
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section reveal">
          <h2 className="section-title">How it works</h2>
          <div className="process-flow">
            {t.howItWorks.steps.map((s, i) => (
              <div className={`process-step box-reveal box-reveal--silent ${i === 1 ? "delay-100" : i === 2 ? "delay-200" : ""}`} key={i}>
                <div className="process-number">0{i + 1}</div>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="stories" className="section reveal">
          <div className="testimonial box-reveal box-reveal--halo box-reveal--angle">
            <blockquote>
              “The structure is simple and it works. I drop in, reset, and get
              back to myself.”
            </blockquote>
            <span>Jada P — 4 months with Exhale</span>
          </div>
        </section>

        <section id="pricing" className="section reveal">
          <h2 className="section-title">{t.pricing.title}</h2>
          <p className="section-subtitle">{t.pricing.subtitle}</p>
          <div className="pricing">
            {t.pricing.tiers.map((plan, i) => (
              <article className={`price-card box-reveal ${plan.highlight ? "highlight box-reveal--halo box-reveal--offset" : "box-reveal--cut box-reveal--ticks"}`} key={i}>
                <h4>{plan.name}</h4>
                <strong>{plan.price}</strong>
                <ul>
                  {plan.features.map((f, j) => (
                    <li key={j}>{f}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="section reveal">
          <div className="cta-panel box-reveal box-reveal--halo box-reveal--cornerflip">
            <h2>{t.cta.title}</h2>
            <p>{t.cta.desc}</p>
            <div className="hero-actions">
              <Link href={`/signup?role=${role}`} className="cta-button no-underline flex items-center">
                {t.cta.btn}
              </Link>
              <a href="#pricing" className="ghost-button no-underline flex items-center">
                Schedule a tour
              </a>
            </div>
          </div>
        </section>

        <footer>
          <div>Exhale © 2026</div>
          <div>hello@exhale.com · Privacy · Terms</div>
        </footer>
      </div>
    </div>
  );
}
