# Exhale Frontend Pages Specification

## Project Overview

**Exhale** is a therapy support application with three main components:
- **Web App** (Next.js) - For both therapists and patients
- **Mobile App** (Flutter) - For both therapists and patients
- **Backend API** (NestJS with Prisma/PostgreSQL)

Both web and mobile platforms serve two user roles:
- **Therapists** - Manage practice, patients, sessions, homework, billing
- **Patients** - Track mood, journal, complete homework, attend sessions, communicate with therapist

---

## Current State Assessment

### What Exists

**Web (apps/web):**
- Landing page with patient/therapist toggle (fully designed)
- Dashboard sidebar component with navigation structure
- UI component library via shadcn/ui (button, card, form, sidebar, avatar, etc.)
- No actual dashboard pages or authenticated routes exist

**API (apps/api):**
- Basic NestJS setup with Prisma
- Comprehensive database schema covering: Users, Therapist/Patient Profiles, Homework, Mood Entries, Journal Entries, Sessions, Media, Push Notifications, Audit Logs
- Basic JWT authentication (login/profile endpoints)
- No CRUD modules implemented (Users, Homework, Mood, Journal, Sessions all marked as "Planned")

**Mobile (apps/mobile):**
- Default Flutter counter template - no real implementation

**Shared Types:**
- TypeScript interfaces matching the Prisma schema

---

## Frontend-First Approach Rationale

Starting with frontend is reasonable for the following reasons:
1. The database schema is well-defined and stable
2. Shared types already exist for frontend/backend contracts
3. The landing page design establishes the visual language
4. Building UI components and page layouts can proceed in parallel with backend development
5. You can mock API responses using the shared types until the backend is ready

**Caveats:**
- Authentication flow will need backend coordination early
- Build forms and data structures aligned with the Prisma schema

---

## Web App Pages - Complete List

### Shared Pages (Both Roles)

#### Authentication

| Page | Description |
|------|-------------|
| Login Page | Email/password form, role selection, forgot password link |
| Register Page | Registration form with role selection (patient or therapist), therapist requires license info |
| Forgot Password Page | Email input for password reset |
| Reset Password Page | New password form with token validation |
| Email Verification Page | Confirmation after registration |

---

### Therapist Portal Pages

#### Therapist Dashboard

| Page | Description |
|------|-------------|
| Dashboard Overview | Key metrics (active patients, upcoming sessions, unread messages, pending homework reviews), today's schedule widget, recent activity feed, quick actions |

#### Patient Management (Therapist View)

| Page | Description |
|------|-------------|
| Patients List Page | Table/grid of all patients with search, filter by status (active/inactive), sort options, pagination |
| Patient Detail Page | Patient profile header, tabs for different sections |
| Patient Profile Tab | Personal info, emergency contact, relationship start date, status |
| Patient Mood History Tab | Mood score timeline chart, mood entry list with tags and notes, date range filter |
| Patient Journal Access Tab | List of shared journal entries (patient-approved only), follow-up prompts and responses |
| Patient Homework Tab | Assigned homework list, completion status, due dates, ability to review responses |
| Patient Notes Tab | Questions from patient awaiting response, resolved/unresolved toggle |
| Patient Sessions Tab | Session history for this patient, session notes and summaries |
| Add Patient Page/Modal | Form to add new patient or invite via email |
| Assign Homework Modal | Select from templates or create custom, set due date, assign to patient |

#### Homework Management (Therapist)

| Page | Description |
|------|-------------|
| Homework Templates List Page | Grid of reusable homework templates, filter by type (reading, writing, quiz, drawing, voice note, checklist, custom) |
| Create Homework Template Page | Form builder for different homework types, JSON content editor, preview mode |
| Edit Homework Template Page | Modify existing template |
| Homework Assignments Overview | All assigned homework across patients, filter by status (pending, in progress, completed, overdue) |
| Review Homework Submission Page | View patient response, add feedback, mark as reviewed |

#### Sessions (Therapist)

| Page | Description |
|------|-------------|
| Sessions Calendar Page | Monthly/weekly/daily calendar views, scheduled sessions displayed with patient name, drag to reschedule |
| Sessions List Page | Table view alternative to calendar, upcoming and past sessions |
| Schedule Session Modal | Select patient, choose date/time, set duration, recurrence options |
| Video Session Room Page | Video interface integration (Daily/Twilio), session timer, note-taking panel, end session button |
| Session Notes Page | Rich text editor for session notes, auto-save |
| Session Summary Page | View/edit AI-generated summary, key points list, next steps list |

#### Messaging (Therapist)

| Page | Description |
|------|-------------|
| Messages Inbox Page | Conversation list with patients, unread indicators, search |
| Message Thread Page | Chat interface with selected patient, message history, attachment support |

#### Analytics and Reports (Therapist)

| Page | Description |
|------|-------------|
| Practice Analytics Page | Revenue metrics, session counts, client retention charts, referral sources |
| Patient Outcomes Dashboard | Aggregate mood trends, homework completion rates, standardized measure results (GAD-7, PHQ-9) |
| Export Reports Page | Generate PDF/CSV reports for insurance, select date range, patient |

#### Billing (Therapist - Optional)

| Page | Description |
|------|-------------|
| Billing Overview Page | Outstanding invoices, payment history |
| Invoice Detail Page | Line items, payment status, send reminder |
| Superbill Generator Page | CPT codes, session details for insurance claims |

#### Therapist Settings

| Page | Description |
|------|-------------|
| Account Settings Page | Profile photo, name, email, password change |
| Practice Settings Page | License number, specialty, bio, practice name |
| Notification Settings Page | Email preferences, push notification toggles |
| Availability Settings Page | Set working hours, block time off, recurring schedule |
| Integration Settings Page | Connect calendar (Google/Outlook), payment processor setup |

#### Resource Library (Therapist - Optional)

| Page | Description |
|------|-------------|
| Resource Library Page | Grid of worksheets, videos, articles to share with patients |
| Upload Resource Page | Add custom resources to library |

#### Audit and Compliance (Therapist)

| Page | Description |
|------|-------------|
| Audit Log Page | Table of all actions (view patient, update homework, etc.) with filters |

---

### Patient Portal Pages

#### Patient Dashboard

| Page | Description |
|------|-------------|
| Patient Home | Daily plan/rituals widget, mood check-in prompt, upcoming session reminder, homework due reminders, motivational content |

#### Mood Tracking (Patient)

| Page | Description |
|------|-------------|
| Mood Check-in Page | Mood score selector (1-10), emotion tags, optional notes field, quick submit |
| Mood History Page | Personal mood timeline chart, filter by date range, list view of past entries with tags |
| Mood Insights Page | AI-generated patterns and trends, correlations with sleep/activities |

#### Smart Journal (Patient)

| Page | Description |
|------|-------------|
| Journal List Page | List of past journal entries (encrypted), search, date filter |
| New Journal Entry Page | Rich text editor, AI follow-up prompts appear after writing, option to share with therapist |
| Journal Entry Detail Page | View past entry, see follow-up Q&A thread, edit or delete |

#### Homework (Patient)

| Page | Description |
|------|-------------|
| Homework List Page | Assigned homework with due dates, status indicators (pending, in progress, completed, overdue) |
| Homework Detail Page | View assignment instructions, complete interactive content (reading, writing, quiz, drawing, voice note, checklist) |
| Homework Submission Page | Submit completed work, add notes for therapist |

#### Sessions (Patient)

| Page | Description |
|------|-------------|
| Upcoming Sessions Page | List of scheduled sessions with therapist, join button when available |
| Video Session Room Page | Video interface, chat panel for in-session notes, end session button |
| Past Sessions Page | Session history, view summaries shared by therapist, key points and next steps |

#### Messaging (Patient)

| Page | Description |
|------|-------------|
| Messages Page | Chat interface with therapist, message history, send attachments |

#### Patient Notes (Patient)

| Page | Description |
|------|-------------|
| Notes to Therapist Page | Write questions/thoughts for therapist to review, see resolved/unresolved status |

#### Wellness Tools (Patient)

| Page | Description |
|------|-------------|
| Meditation Library Page | Browse audio sessions by category (anxiety, sleep, focus), play/pause, favorites |
| Breathwork Page | Visual breathing guides (box breathing, 4-7-8, physiological sigh), timer |
| Crisis Support Page | One-tap access to safety plan, crisis hotlines, emergency contacts, location sharing |

#### Patient Settings

| Page | Description |
|------|-------------|
| Account Settings Page | Profile photo, name, email, password change |
| Personal Info Page | Date of birth, emergency contact |
| Notification Settings Page | Reminder preferences, push notification toggles |
| Privacy Settings Page | Control what journal entries are shared with therapist |
| Data Export Page | Download personal data (mood logs, journals) as PDF/JSON |

---

## Page Count Summary

| Category | Therapist | Patient | Shared |
|----------|-----------|---------|--------|
| Authentication | - | - | 5 |
| Dashboard | 1 | 1 | - |
| Patient/Therapist Management | 10 | - | - |
| Mood Tracking | - | 3 | - |
| Journal | - | 3 | - |
| Homework | 5 | 3 | - |
| Sessions | 6 | 3 | - |
| Messaging | 2 | 1 | - |
| Notes | - | 1 | - |
| Wellness Tools | - | 3 | - |
| Analytics/Reports | 3 | - | - |
| Billing | 3 | - | - |
| Settings | 5 | 5 | - |
| Resource Library | 2 | - | - |
| Audit | 1 | - | - |
| **Subtotal** | **38** | **23** | **5** |
| **Total Unique Pages** | | | **66** |

---

## Recommended Implementation Order

### Phase 1: Foundation
1. Set up routing structure with role-based route groups
2. Build shared authentication pages (login, register with role selection)
3. Create role-specific dashboard layouts

### Phase 2: Therapist Core
4. Therapist dashboard overview
5. Patient management module (list, detail, tabs)
6. Sessions module (calendar, scheduling, video room)
7. Homework module (templates, assignments, review)

### Phase 3: Patient Core
8. Patient dashboard/home
9. Mood tracking (check-in, history, insights)
10. Smart journal (entries, AI follow-ups)
11. Patient homework (view, complete, submit)
12. Patient sessions (view upcoming, join video, past summaries)

### Phase 4: Communication
13. Messaging for both roles
14. Patient notes to therapist

### Phase 5: Wellness Tools (Patient)
15. Meditation library
16. Breathwork guides
17. Crisis support

### Phase 6: Configuration
18. Settings pages for both roles

### Phase 7: Analytics (Deferrable)
19. Therapist practice analytics
20. Patient outcomes dashboard

---

## Development Notes

- For each module, build the frontend with mocked data first, then connect to API endpoints as they become available
- Use the shared-types package (`packages/shared-types`) for type consistency
- Follow the design language established in the landing page (Instrument Sans/Serif fonts, dark/light theme support)
- Leverage existing shadcn/ui components in `apps/web/src/components/ui`
- Implement role-based routing guards early to prevent unauthorized access

---

## File Structure Recommendation

```
apps/web/src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   └── reset-password/
│       └── page.tsx
├── (therapist)/
│   ├── layout.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── patients/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── sessions/
│   │   ├── page.tsx
│   │   ├── calendar/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── homework/
│   │   ├── page.tsx
│   │   ├── templates/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── messages/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── analytics/
│   │   └── page.tsx
│   ├── billing/
│   │   └── page.tsx
│   ├── resources/
│   │   └── page.tsx
│   ├── audit/
│   │   └── page.tsx
│   └── settings/
│       ├── page.tsx
│       ├── account/
│       │   └── page.tsx
│       ├── practice/
│       │   └── page.tsx
│       ├── notifications/
│       │   └── page.tsx
│       ├── availability/
│       │   └── page.tsx
│       └── integrations/
│           └── page.tsx
├── (patient)/
│   ├── layout.tsx
│   ├── home/
│   │   └── page.tsx
│   ├── mood/
│   │   ├── page.tsx
│   │   ├── check-in/
│   │   │   └── page.tsx
│   │   └── insights/
│   │       └── page.tsx
│   ├── journal/
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── homework/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── sessions/
│   │   ├── page.tsx
│   │   ├── room/
│   │   │   └── page.tsx
│   │   └── history/
│   │       └── page.tsx
│   ├── messages/
│   │   └── page.tsx
│   ├── notes/
│   │   └── page.tsx
│   ├── wellness/
│   │   ├── meditation/
│   │   │   └── page.tsx
│   │   ├── breathwork/
│   │   │   └── page.tsx
│   │   └── crisis/
│   │       └── page.tsx
│   └── settings/
│       ├── page.tsx
│       ├── account/
│       │   └── page.tsx
│       ├── notifications/
│       │   └── page.tsx
│       ├── privacy/
│       │   └── page.tsx
│       └── export/
│           └── page.tsx
├── session-room/
│   └── [id]/
│       └── page.tsx          # Shared video room (accessible by both roles)
├── layout.tsx
└── page.tsx                   # Landing page
```

---

## Mobile App Pages (Flutter)

The mobile app will mirror most of the web functionality with mobile-optimized UI:

### Shared Mobile Pages
- Splash/Onboarding screens
- Login/Register screens
- Push notification permissions

### Therapist Mobile Features
- Dashboard with today's schedule
- Patient list and quick view
- Session management
- Quick messaging
- Notification center

### Patient Mobile Features
- Daily rituals home screen
- Mood check-in (optimized for quick entry)
- Journal with voice-to-text option
- Homework completion
- Session join
- Messaging
- Breathwork and meditation (offline capable)
- Crisis support with one-tap call

Note: Full therapist functionality (billing, analytics, templates) may be web-only for complex tasks.
