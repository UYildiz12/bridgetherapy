# Exhale Capabilities Checklist

Source: local CBT therapist survey CSV in `Scaleresults/`, summarized from 5 usable rating responses. Raw survey exports are intentionally not committed here.

Billing, insurance, and HIPAA/legal compliance deliverables remain explicitly out of scope for this checklist.

| Survey capability | Avg | Current status | Product surface |
| --- | ---: | --- | --- |
| Session whiteboard for sharing ideas | 4.6 | Implemented | Session workspace canvas with patient/therapist APIs |
| Homework/task reminder notifications | 4.4 | Implemented | Push tokens + cron reminder workflow |
| Psychoeducation modules: video/article/quiz | 4.0 | Implemented | Patient Learn library + homework reading/quiz item types |
| Interactive CBT principles and process education | 4.0 | Implemented | CBT loop education in onboarding and Learn |
| Quick access to previous session notes | 4.0 | Implemented | Therapist session detail shows recent session history |
| Patient can add notes during/after session | 3.8 | Implemented | Session workspace patient note |
| Therapist can add notes during/after session | 3.8 | Implemented | Therapist session notes |
| Client progress on one screen | 3.8 | Implemented | Reports include mood, homework, reflections, sessions, and CSV export |
| Homework assignment and completion tracking | 3.6 | Implemented | Homework sets, assignments, review |
| Mood tracking between sessions | 3.6 | Implemented | Mood check-ins and charts |
| Symptom/progress measurement graphs | 3.6 | Implemented | Mood trends plus formal measure-style progress summary |
| Biometric security measures | 3.6 | Implemented | Browser passkey/biometric availability check + local lock preference |
| Treatment-planning protocol library | 3.6 | Implemented | Therapist protocol library |
| Short post-session summary | 3.4 | Implemented | Therapist AI summary plus patient-facing session summary |
| Online video session platform | 3.0 | Implemented | Free Jitsi session rooms |
| Easy AI-assisted custom homework creation | 3.0 | Implemented | Therapist-reviewed Gemini Flash-Lite draft route |
| Emergency therapist access by therapist preference | 2.8 | Implemented | Therapist urgent-access preference with crisis boundary copy |
| AI smart journal asking follow-up questions | 2.2 | Implemented | Lumen reflections |
| Smartwatch/wearable data integration | 1.6 | Missing, low priority | Not planned for this free web/PWA pass |

## Implementation Notes

- Keep AI supportive and bounded. Survey comments warned that frequent AI use can become reassurance or safety-seeking behavior for some patients.
- Keep therapist relationship primary. The app should support therapy, not replace it or present itself as clinical intervention.
- Smartwatch/wearable integration remains excluded from this web/PWA implementation because it requires platform/device data integrations and was the lowest-rated survey item.
