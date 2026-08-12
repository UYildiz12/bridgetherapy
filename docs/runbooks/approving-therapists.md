# Approving a therapist

New therapists self-register at `/signup` (and are warned there that their account
needs review). They land in a **pending** state: they can sign in, but the entire
authenticated app shows an "under review" screen and every therapist capability is
blocked by `requireApprovedTherapist` (`apps/web/src/lib/authz.ts`) until an admin
approves them. The `THERAPIST` role alone grants nothing — approval is the gate.

## Approve

From the repo root, with the dev/prod env file present at the repo root (`.env`):

```bash
pnpm --filter web db:approve therapist@example.com
```

- Sets `TherapistProfile.approvedAt` and writes an `APPROVE_THERAPIST` audit log
  (`metadata: { via: "cli" }`).
- Idempotent: re-running on an approved therapist prints "already approved" and
  changes nothing.
- Exits non-zero with a clear message if the email is unknown or the account is
  not a therapist.

### How it runs

The `db:approve` script is:

```
dotenv -e ../../.env -- tsx --conditions=react-server src/scripts/approve-therapist.ts
```

- `dotenv -e ../../.env` loads `DATABASE_URL` from the repo-root `.env`. If your env
  lives elsewhere, point the `-e` flag there or set `DATABASE_URL` in your shell.
- `--conditions=react-server` makes the `server-only` marker (imported transitively
  via the audit/db modules) resolve to its no-op entry, so the script runs outside
  Next's runtime under `tsx`.

## Verify

The therapist reloads the app: the "under review" screen
(`components/app/therapist-pending.tsx`, gated in `app/(app)/layout.tsx`) is replaced
by the normal workspace. No approval ⇒ the pending screen persists and therapist
API calls return 403.

## Notes

- There is no admin UI yet — approval is CLI-only by design (the `approveTherapist`
  helper in `apps/web/src/lib/approve-therapist.ts` is the seam a future admin
  UI/route will reuse).
- The `approvedAt` column is added by the Prisma migration `add_therapist_approval`.
  If it has not been applied to your database yet, run
  `pnpm --filter @exhale/db migrate -- --name add_therapist_approval` (needs
  `DATABASE_URL` + `DIRECT_URL`).
