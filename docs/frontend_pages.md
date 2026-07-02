# Exhale Feature Inventory

This repo is currently a Next.js App Router application with Route Handler APIs, Prisma, Supabase Auth/Postgres/Storage integration, PWA support, and a lightweight Expo/React Native mobile client against the same APIs. Billing and HIPAA/compliance deliverables are intentionally out of scope for the current branch.

## Already Implemented

| Area | Status |
| --- | --- |
| Landing page | Patient/therapist role toggle, animated product preview, PWA metadata. |
| Authentication | Supabase login/signup pages, user provisioning route, role-specific profile creation, pending therapist state. |
| App shell | Authenticated patient and therapist navigation, larger mobile dropdown menu, user display, sign out, role-aware menus. |
| Therapist approval | Admin script and approval gate; therapist-only APIs require `approvedAt`. |
| Patient dashboard | Authenticated home dashboard with links into core patient flows. |
| Mood tracking | Patient mood entry API, client helper, fractional check-in UI, history list, chart display, validation tests. |
| Intake | Guided, step-by-step CBT-informed onboarding with focus areas, availability, current problems, recent situations, thoughts, emotions, body sensations, behaviors, screening-style frequency prompts, safety/support context, strengths, therapist preferences, and generated blueprint-style matching artwork. |
| Therapist matching | Directory API, patient connection requests, therapist request review APIs, specialty/availability scoring with exact and related concern matches. |
| Therapist profile | Therapist specialties, availability, bio, accepting-patients profile route and UI. |
| Patient invitations | Therapist can invite registered patients by email; invitations stay pending until patient consent. |
| Homework sets | Therapist composes block documents (instructions, text answers, scales, choices, checklists, tables/logs, voice/drawing, app activities) with presets, a live patient preview, and guarded Gemini draft assistance. Legacy item sets still render through adapters. |
| Homework assignment | Therapist assigns sets only to active linked patients; one-shot or recurring (daily/weekly entries until the due date); patient completes and submits with autosave. |
| Homework review | Therapist reviews per entry with per-block comments, measure scores, overall feedback, and can request changes. |
| Media attachments | Patient media upload/download routes with owner checks for homework voice and drawing responses. |
| Reflections / patient notes | Patients use one private reflections workspace with optional titles, therapist sharing, private Lumen conversation turns backed by Gemini/`AI_key`, and read-only therapist access to shared entries. |
| Sessions | Therapist and patient session screens with scheduling, linked access checks, video rooms, clinical notes, patient notes, shared whiteboard, prior-session history, and AI summary generation. |
| CBT learning | Patient Learn page with CBT loop education and psychoeducation modules. |
| Protocol library | Therapist protocol library for behavioral activation, exposure ladders, problem solving, and homework sequencing. |
| Messaging | Patient-therapist conversation list and thread screens, active-link access checks, message sending, and explicit read-state updates. |
| Wellness tools | Breathwork pattern switcher, grounding/meditation prompts, and crisis support screen with emergency/988 actions. |
| Settings | Role-aware account, profile-link, notification preference, therapist urgent-access preference, browser/passkey lock affordance, and privacy-boundary settings page. |
| Reports | Patient progress metrics, session attendance, formal measure-style summaries, therapist active-patient outcome summaries, and patient CSV export rows. |
| Push notifications | Push-token registration/removal API, client helper, and cron reminder workflow for due homework and upcoming sessions through a pluggable webhook. |
| Mobile app | Expo/React Native workspace with bearer-token API client and native shell for account sync, mood check-ins, reflections, homework, messages, reports, and wellness guidance. |
| AI summaries and drafts | Server-side Gemini support using `AI_key`, `gemini-3.1-flash-lite`, therapist session-summary route, and guarded homework draft route. |
| Database | Prisma schema and migrations for users, profiles, connections, mood, notes, homework, sessions, summaries, media, push tokens, and audit logs. |
| Quality gates | Unit/API/component tests, lint, typecheck, production build, dependency audit, and CI workflow coverage. |

## Remaining Product Work

Smartwatch/wearable data integration is not implemented in this free web/PWA pass. It requires native/device-platform data integrations and was the lowest-rated survey item.

## Explicitly Excluded

- Billing, invoices, superbills, payment processing, and insurance workflows.
- HIPAA/compliance certification, legal policy work, BAAs, compliance audits, and formal security attestation.
- Direct smartwatch/HealthKit/Google Fit integrations in the current web app.
