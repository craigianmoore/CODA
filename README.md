# CODA — Next.js + Supabase

This is CODA (Coach Observation Development App) rebuilt to run on Vercel
instead of as a Claude artifact — the full-featured version, including
Completed Tasks (attendance/coursework tracking), Logistics, the
attendance-driven Dashboard course tracking, Diploma Blocks, Course
Numbers, Potential Future Pathways, and PDF export from a report.

The app logic and every screen are the same as before. What changed is the
storage layer: instead of one JSON blob per collection in Claude's
`window.storage` (the setup that caused data loss with multiple people
using it at once), every coach, course, CET, observation, and completed-
task record now gets its own row in a real Postgres table. Two people
editing different records at the same time now touch different rows
instead of racing to overwrite one shared blob.

## 1. Create a Supabase project

1. Go to supabase.com → New project (its own project — keep it separate
   from any other Supabase project you have).
2. Open the SQL Editor and paste in the contents of `supabase-schema.sql`
   from this folder, then run it. This creates:
   - `coaches`, `courses`, `cets`, `observations`, `completed_tasks` — one
     row per record each
   - `kv_settings` — small singleton settings (admin list, PIN lockouts,
     closed course numbers, the Lead-Admin session lock)
   - `trial_users` — named PIN access for whoever you invite to trial it
3. Project Settings → API. Copy the **Project URL** and the **anon
   public** key.

## 2. Add your trial users

In the Supabase Table Editor, open `trial_users` and add one row per
person, e.g.:

| name         | pin  | is_admin |
|--------------|------|----------|
| Craig Moore  | 2468 | true     |
| Jane Smith   | 1357 | false    |

This is separate from CODA's own internal Admin Settings (the
name+PIN pairs, used for Clear History, Admin export, and Reopen Report)
— `trial_users` just decides who can open the app at all. Admin PINs are
checked on the server; see "Admin PINs are server-side" below.

## 3. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in the two values
from step 1. This step is only needed if you're testing locally with
`npm run dev` — if you're deploying straight to Vercel, skip it and
enter the same two values directly in Vercel's Environment Variables
instead (step 5 below).

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

## 4. Run it locally (optional, to test before deploying)

```
npm install
npm run dev
```

Then open http://localhost:3000

## 5. Push to GitHub and deploy to Vercel

1. Push this folder to your GitHub repo (replacing the previous contents).
2. On Vercel, go to your project → Settings → Environment Variables and
   add the same two values from step 1 — set them as **Config/Plaintext
   type**, not Secret.
3. Redeploy (or it'll auto-deploy on push, depending on your Vercel
   project settings).

## What's in this version that wasn't in the first migration

- **Completed Tasks** tab — attendance % and coursework checklist tracking
  per coach, per course, with CSV import for diploma coursework CSVs
- **Logistics** tab — merged Coaches & CETs + Course Library
- **Dashboard course tracking** — Open Courses (bulk/individual attendance
  entry, Close Course), Completed Courses, Incompleted Course sections
- **Diploma Block** auto-calculated from attendance (days 1–2 → Block 1,
  3–5 → Block 2, 6–9 → Block 3), plus Course Number and session numbering
- **Richer pitch map** — real markings (boxes, D-arcs, centre circle), tap
  zones directly, "Full Pitch" toggle, D3/M3/F3 calculated automatically
- **Potential Future Pathways** — shown when an outcome scores Highly
  Competent (16+/18)
- **Tougher action-plan wording** for scores of 0/1 — direct and honest
  rather than softened, while 2/3 stay warmer and reflective
- **Download PDF** button directly on a report (new — the one gap found
  when migrating; previously PDF export only existed as a bulk,
  admin-gated tool)
- **Lead Admin session lock**, IDP upload/tracking per coach, view-mode
  toggle (Phone/Tablet/Laptop) — all carried over unchanged

## Landing page and app route

The app is now split across two routes:

- `/` — a marketing landing page introducing CODA. No login required.
- `/app` — the actual PIN-gated app (what used to live at `/`).

Both "Open CODA" buttons on the landing page link to `/app`. If you'd
rather the app live at the root again, swap `app/page.js` (landing) and
`app/app/page.js` (the app) back — just remember to fix the relative
import paths in whichever file ends up at `/app` (`../../lib/supabase`
and `../../components/CoachObservationApp` one level down from root,
`../lib/supabase` etc. at the root itself).

## FIFA Mentoring (admin-only area)

A separate **FIFA Mentoring** tab (the FIFA Coach Educators' Mentoring Programme
tracker) sits behind its own permission, independent of CODA admin rights:

| Login | Sees |
|---|---|
| FA Admin (master) | CODA and FIFA Mentoring |
| MF Admin / Coordinator / Course Admin | CODA only, unless an FA Admin switches **FIFA: on** next to their name (History -> Admin) |
| **FIFA Mentor** (new role, added by an FA Admin) | FIFA Mentoring only |

Same named per-person PIN as the rest of CODA. The page, its data and the FIFA
toolkit PDFs are served only by `/api/fifa/*`, which re-checks the permission on
every request, so removing access or changing a PIN takes effect immediately.

One-off setup:

1. Run `supabase-migrations/2026-11-12-fifa-mentoring.sql` in the Supabase SQL editor
   (creates `fifa_mentees`, closed to the anon key, and a private `fifa-mentoring` bucket).
2. Upload `tracker.html` and `meeting-1.pdf` ... `meeting-5.pdf` to that bucket
   (Storage -> fifa-mentoring). They are deliberately not in this repo, which is public.
3. Add `SUPABASE_SERVICE_ROLE_KEY` (server-only, no `NEXT_PUBLIC_` prefix) in Vercel and redeploy.

Each admin only ever sees their own mentees and notes.

## Admin PINs are server-side

Admin names, PINs and sign-in lockouts are no longer readable or writable with the
public anon key. The browser only gets a PIN-free list (`/api/admin/directory`) and asks
the server to check a PIN (`/api/admin/verify`) or to save a change
(`/api/admin/settings`, which re-checks that the signed-in admin is allowed to make
that exact change: only an FA Admin can change roles, other admins' PINs, FIFA access
or limits; an MF Admin can manage Course Admins/Coordinators in their own federation;
anyone can change their own PIN).

Needs `SUPABASE_SERVICE_ROLE_KEY` (already required for FIFA Mentoring). Optional:

- `SUPPORT_ACCESS_KEY` - the recovery PIN that signs in as FA Admin. Still works with the
  old `NEXT_PUBLIC_SUPPORT_ACCESS_KEY` name; prefer the new name so it is not exposed to
  the browser.
- `CODA_BOOTSTRAP_ADMIN_NAME` / `CODA_BOOTSTRAP_ADMIN_PIN` - only used if no admin
  settings have ever been saved, to seed the first FA Admin.

Rollout order matters:

1. Deploy this version (Vercel). Confirm you can still sign in as an admin.
2. Then run `supabase-migrations/2026-11-13-private-admin-settings.sql`. Running it before
   the deploy would break sign-in on the old version.
3. Change your admin PIN (History -> Admin -> Edit PIN) if you have not since the repo went
   public: old PINs stay in git history.

What this does not change: CODA's other tables (coaches, observations, courses...) are
still open to the anon key, and destructive actions still go from the browser to Supabase
after the server says the PIN is OK.
