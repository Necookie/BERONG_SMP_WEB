# BERONG SMP — Dashboard Admin Manual

This covers the **Analytics Dashboard** (`apps/dashboard`) — the tool instructors
and BFP evaluators use to review student simulation runs. For the public
landing page (installer download, install instructions), see
[`usermanual.md`](usermanual.md).

> The dashboard also has its own in-app **System Guide** at `/guide` once
> logged in, which covers the whole pipeline end to end (Minecraft server
> setup, the student's drill flow, the classifier). This manual focuses on
> the dashboard's own screens; use `/guide` for the wider picture.

## Logging in

**First time ever (no accounts exist yet):** visiting the dashboard redirects
to `/setup` — a one-time "Initialize Administrator" screen where you create
the first account. That account is automatically the **owner**. Once any
account exists, `/setup` is permanently disabled and redirects to `/login`.

**Every time after that:** `/login` with username + password. A successful
login issues a 7-day session. Every page except `/login` and `/setup` requires
being logged in.

**Adding more staff:**
- They can self-register from the **"Create Account"** link on the login
  page — but their account sits as **pending** and can't log in until the
  owner approves it on the Users page.
- Or the owner can add an admin account directly from **Users** (`/users`) —
  active immediately, no approval needed.

> ⚠️ **Known quirk to be aware of:** if someone self-registers using the exact
> username `necookie`, the account is auto-approved as **owner** immediately,
> bypassing the pending-approval step. This looks like a leftover developer
> convenience rather than an intended feature — worth having removed before
> any real public deployment, and worth knowing about in the meantime.

**Roles:** just two — **owner** (can manage other accounts, normally the
first one created) and **admin**. There is no read-only role; any logged-in
account can edit or delete session data.

## Pages

| Page | What it's for |
|---|---|
| **Overview** (`/`) | The landing dashboard — average score, fire/earthquake split, total sessions, preparedness distribution (HIGH/MODERATE/LOW), a score histogram, and a live-updating "recent sessions" table. An "Advanced" toggle reveals extra charts (score trend over time, per-section performance, evacuation-time distribution, etc.). |
| **Sessions** (`/sessions`) | Every recorded drill run, filterable by scenario and preparedness level, searchable, sortable. Checkbox-select rows for bulk delete. Click any row to open its detail page. |
| **Session detail** (`/sessions/[id]`) | The deep-dive for one student's run: event timeline, movement replay map, the built-in classifier's result, and the optional AI assessment (see below). This is also where you edit details, add notes, or delete the session. |
| **Roster** (`/roster`) | Per-student aggregated stats — session count, average/best score, pass rate, best tier reached, filterable by section. |
| **Data** (`/data`) | Export completed live sessions as CSV. |
| **Commands** (`/commands`) | Reference for every in-game `/` command — handy if you're the one running the physical drill and need to remember `/bfp checkin` syntax, etc. |
| **Guide** (`/guide`) | The built-in full-pipeline walkthrough mentioned above. |
| **Users** (`/users`, owner only) | Approve/suspend/delete staff accounts, add new admins directly. Not visible in the sidebar unless you're the owner. |
| **Profile** (`/profile`) | Change your own username/password. |

## Reviewing a session

Open any row from Sessions, Roster, or Overview's recent-sessions table. You'll see:

- The event timeline (extinguisher use, alarm pulls, evacuation, etc.)
- A movement replay map (when available)
- The dashboard's own built-in classifier result (labelled "RF CLASSIFIER")
- **AI Preparedness Analysis** — a collapsible drawer with a **"Run MiDRR
  Assessment"** button. Clicking it sends the session to an external ML
  scoring service and returns a score gauge, a tier (HIGH/MODERATE/LOW), a
  five-metric "behavior profile" radar chart compared against the class
  average, and a short written explanation of what drove the score.

  > ⚠️ This model is trained on fabricated/synthetic sessions, **not real
  > students** — the app itself displays this disclaimer on every result.
  > Treat it as a demonstration of the pipeline, not a real assessment, until
  > it's retrained on real data.

  This can take a little while on the first request after a period of
  inactivity (the scoring service "wakes up" from a cold start) — the UI
  shows a friendly waiting/retry message rather than failing silently.

If either the built-in classifier or the AI assessment comes back LOW, the
page shows a "RETAKE REQUIRED" banner.

## What you can do from a session

Available to **any logged-in account**:
- Edit the recorded details (student name/ID, section, scenario, score, prep
  level, pass/fail)
- Delete the session (single, or bulk-delete several from the Sessions list)
- Add free-text notes
- Run/re-run the AI assessment
- Export the session's raw movement/fire CSV logs

Every edit and delete is recorded in a visible change history on the session
page — who changed what, and when.

**Owner-only:** the Users page (approving/suspending/adding staff accounts).

## Deployment / config (for whoever manages hosting)

The dashboard runs on Cloudflare Workers. It needs three environment
variables set in the Cloudflare dashboard (or `apps/dashboard/.dev.vars`
locally, copied from `.dev.vars.example`):

| Variable | Purpose |
|---|---|
| `TURSO_URL` | The cloud database URL — same database the Minecraft mod writes session data to. |
| `TURSO_TOKEN` | Auth token for that database. |
| `MIDRR_API_URL` | URL of the external AI scoring service (has a working default, only override if the service moves). |

If `TURSO_URL`/`TURSO_TOKEN` are missing, every page shows a "no DB
configured" warning instead of erroring — that's expected, not a bug. Fix by
adding the variables in the Cloudflare Worker's settings, then redeploy with
`npx wrangler deploy` (or `pnpm deploy:dashboard` from the repo root).
