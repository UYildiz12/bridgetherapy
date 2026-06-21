# Exhale Feature Inventory

This repo is currently a Next.js App Router application with Route Handler APIs, Prisma, Supabase Auth/Postgres/Storage integration, and PWA support. Native mobile, billing, and HIPAA/compliance deliverables are intentionally out of scope for the current branch.

## Already Implemented

| Area | Status |
| --- | --- |
| Landing page | Patient/therapist role toggle, animated product preview, PWA metadata. |
| Authentication | Supabase login/signup pages, user provisioning route, role-specific profile creation, pending therapist state. |
| App shell | Authenticated patient and therapist navigation, user display, sign out, role-aware menus. |
| Therapist approval | Admin script and approval gate; therapist-only APIs require `approvedAt`. |
| Patient dashboard | Authenticated home dashboard with links into core patient flows. |
| Mood tracking | Patient mood entry API, client helper, check-in UI, history list, chart display, validation tests. |
| Intake | Guided, step-by-step CBT-informed onboarding with focus areas, availability, current problems, recent situations, thoughts, emotions, body sensations, behaviors, screening-style frequency prompts, safety/support context, strengths, therapist preferences, and a blueprint-style matching visual. |
| Therapist matching | Directory API, patient connection requests, therapist request review APIs, specialty/availability scoring with exact and related concern matches. |
| Therapist profile | Therapist specialties, availability, bio, accepting-patients profile route and UI. |
| Patient invitations | Therapist can invite registered patients by email; invitations stay pending until patient consent. |
| Homework sets | Therapist creates structured sets with task, writing, quiz, checklist, drawing, and voice-note items. |
| Homework assignment | Therapist assigns sets only to active linked patients; patient can complete and submit assignments. |
| Homework review | Therapist can review submitted assignments and inspect item responses. |
| Media attachments | Patient media upload/download routes with owner checks for homework voice and drawing responses. |
| Reflections / patient notes | Patients capture questions, CBT-style reflections, and session topics in one notes stream; approved therapists can review and resolve notes for active linked patients. |
| AI summaries | Server-side Gemini Interactions API wrapper using `AI_key`, `gemini-3.1-flash-lite`, `store: false`, and a therapist session-summary route. |
| Database | Prisma schema and migrations for users, profiles, connections, mood, notes, homework, sessions, summaries, media, push tokens, and audit logs. |
| Quality gates | Unit/API/component tests, lint, typecheck, production build, dependency audit, and CI workflow coverage. |

## Remaining Product Work

| Area | Needed |
| --- | --- |
| Sessions UI | Calendar/list pages, note editor, and therapist UI trigger for AI-generated summaries. |
| Messaging | Conversation list/thread APIs and UI for patient-therapist messaging. |
| Wellness tools | Breathwork, meditation, and crisis support screens. |
| Settings | Account/profile/notification/privacy settings pages for both roles. |
| Reports | Non-billing clinical progress/outcomes views and exports. |
| Push notifications | Push-token registration and reminder delivery workflows. |
| Mobile app | Expo/React Native client, planned later against the same APIs. |

## Explicitly Excluded

- Billing, invoices, superbills, payment processing, and insurance workflows.
- HIPAA/compliance certification, legal policy work, BAAs, compliance audits, and formal security attestation.
