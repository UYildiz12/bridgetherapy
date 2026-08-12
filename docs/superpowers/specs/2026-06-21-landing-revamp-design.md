# Landing Page Revamp — Design

**Date:** 2026-06-21
**Status:** Approved
**Goal:** Trim the bloated landing page to a lean, credible, *dynamic* page that keeps the existing "blueprint" identity. Implementation is driven by the **`design-taste-frontend`** skill (per user request) while preserving the wired-up auth flow.

## Problem
The current landing (`apps/web/src/app/page.tsx` + `landing.css`) is bloated: a 12-card interactive carousel, a redundant 4-card "Core Values" grid, a fabricated testimonial, pricing (3 tiers × 2 roles), two CTA sections, and meaningless filler (a "Daily Flow / Workflow Flow" eyebrow). It markets far more than exists and overwhelms the reader.

## Keep (identity — do NOT change)
- The **blueprint aesthetic**: dark grid background, blueprint SVGs, Instrument Serif/Sans, white accent, scanline/noise texture, `landing.css` design tokens.
- The **patient/therapist role toggle** driving role-aware copy.
- The **hero** structure (headline, copy, the breathing-orb + ritual-panel visual with mouse-tilt).
- The **wired auth CTAs** (`/signup?role=…`, `/login`) and the `data-theme` light/dark toggle.

## New structure (6 sections, was ~9)
1. **Nav** — logo · role toggle · **"Log in"** as a quiet text link · one prominent **"Get Started"** button. Nav anchor links trimmed to sections that exist (*Features*, *How it works*).
2. **Hero** — unchanged visual; **remove the "Daily Flow / Workflow Flow" eyebrow**; one primary CTA (**Get Started** → `/signup?role={role}`) + a single subtle "See how it works" anchor (no "See Demo" dead-end).
3. **Value props** — **3 role-aware cards** replacing the 12-card carousel.
   - Patient: **Mood Analytics** (led first — the one feature that exists today) · Smart Journaling · Secure therapist connection.
   - Therapist: Auto-Documentation · Client Radar · Unified Stream.
4. **How it works** — keep the existing 3 steps (Match → Engage → Grow).
5. **One CTA panel** — single closing call-to-action (→ `/signup?role={role}`).
6. **Footer** — unchanged.

## Remove
12-card carousel; "Core Values" grid; testimonial; **all pricing**; the duplicate CTA section; the flow-axis eyebrow; competing/duplicate CTA clusters; nav links to removed sections.

## Make it more dynamic (taste-skill territory)
- Scroll-triggered reveals as each section enters the viewport (reuse/extend the existing `.reveal` IntersectionObserver).
- Hero retains breathing orb + mouse-tilt (enhanced, restrained).
- Tasteful hover / micro-interactions on the 3 value cards.
- Generous spacing + rhythm so a leaner page still feels alive, not a static brochure.
- Blueprint motifs (corner ticks, dashed frames) used sparingly for accent, not on every element.

## Constraints / guardrails
- Do not break the auth CTAs or the role/theme toggles.
- Reuse `landing.css` tokens; remove now-unused CSS for deleted sections (don't leave dead rules).
- No new dependencies. Contained to `page.tsx` + `landing.css` (+ small components if the taste skill warrants).
- Build + the existing test suite must stay green; the page is a client component, verified via build + manual look.

## Out of scope
Honesty rewrite of all copy (user chose "trim", not "re-message"); pricing redesign; new illustrations; therapist-vs-patient page split.
