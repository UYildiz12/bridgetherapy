# Exhale Feature Inventory

This repo is currently a Next.js App Router application with Route Handler APIs, Prisma, Supabase Auth/Postgres/Storage integration, PWA support, and a lightweight Expo/React Native mobile client against the same APIs. Billing and HIPAA/compliance deliverables are intentionally out of scope for the current branch.

## Already Implemented

| Area | Status |
| --- | --- |
| Landing page | Patient/therapist role toggle, animated product preview, PWA metadata. |
| Authentication | Supabase login/signup pages, user provisioning route, role-specific profile creation, pending therapist state. |
| App shell | Authenticated patient and therapist navigation, user display, sign out, role-aware menus. |
| Therapist approval | Admin script and approval gate; therapist-only APIs require `approvedAt`. |
| Patient dashboard | Authenticated home dashboard with links into core patient flows. |
| Mood tracking | Patient mood entry API, client helper, fractional check-in UI, history list, chart display, validation tests. |
| Intake | Guided, step-by-step CBT-informed onboarding with focus areas, availability, current problems, recent situations, thoughts, emotions, body sensations, behaviors, screening-style frequency prompts, safety/support context, strengths, therapist preferences, and generated blueprint-style matching artwork. |
| Therapist matching | Directory API, patient connection requests, therapist request review APIs, specialty/availability scoring with exact and related concern matches. |
| Therapist profile | Therapist specialties, availability, bio, accepting-patients profile route and UI. |
| Patient invitations | Therapist can invite registered patients by email; invitations stay pending until patient consent. |
| Homework sets | Therapist creates structured sets with task, writing, quiz, checklist, drawing, and voice-note items. |
| Homework assignment | Therapist assigns sets only to active linked patients; patient can complete and submit assignments. |
| Homework review | Therapist can review submitted assignments and inspect item responses. |
| Media attachments | Patient media upload/download routes with owner checks for homework voice and drawing responses. |
| Reflections / patient notes | Patients use one private reflections workspace with optional titles, therapist sharing, private Lumen conversation turns backed by Gemini/`AI_key`, and read-only therapist access to shared entries. |
| Sessions | Therapist session list and detail screens with scheduling, linked patient access checks, note capture, and AI summary generation. |
| Messaging | Patient-therapist conversation list and thread screens, active-link access checks, message sending, and explicit read-state updates. |
| Wellness tools | Breathwork pattern switcher, grounding/meditation prompts, and crisis support screen with emergency/988 actions. |
| Settings | Role-aware account, profile-link, notification preference, and privacy-boundary settings page. |
| Reports | Patient progress metrics, therapist active-patient outcome summaries, and patient CSV export rows. |
| Push notifications | Push-token registration/removal API, client helper, and cron reminder workflow for due homework and upcoming sessions through a pluggable webhook. |
| Mobile app | Expo/React Native workspace with bearer-token API client and native shell for account sync, mood check-ins, reflections, homework, messages, reports, and wellness guidance. |
| AI summaries | Server-side Gemini Interactions API wrapper using `AI_key`, `gemini-3.1-flash-lite`, `store: false`, and a therapist session-summary route. |
| Database | Prisma schema and migrations for users, profiles, connections, mood, notes, homework, sessions, summaries, media, push tokens, and audit logs. |
| Quality gates | Unit/API/component tests, lint, typecheck, production build, dependency audit, and CI workflow coverage. |

## Remaining Product Work

No non-billing, non-HIPAA product areas are currently listed as remaining in this inventory.

## Explicitly Excluded

- Billing, invoices, superbills, payment processing, and insurance workflows.
- HIPAA/compliance certification, legal policy work, BAAs, compliance audits, and formal security attestation.
