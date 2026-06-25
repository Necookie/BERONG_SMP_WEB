# BERONG SMP Web (Astro monorepo: landing page + dashboard)

## Paired repo
NeoForge mod (BerongSMP) at:
C:\Users\dheyn\Documents\02_Dev\berongsmp-template-26.1.2

## System role
This repo hosts:
1. The public landing page (`apps/landing`) — Astro + React islands, green/black pixel aesthetic, deployed as a Cloudflare Worker (static assets)
2. The Web Analytics Dashboard (`apps/dashboard`) — SSR Astro app with React islands, deployed as a Cloudflare Worker with Assets

> **Note:** A FastAPI DRR API service was originally planned as a third entry point but has not been implemented in this repo. See the ML/pipeline section below.

---

## Monorepo structure

```
BERONG_SMP_WEB/
├── apps/
│   ├── landing/          # Public landing page (Astro, static output)
│   └── dashboard/        # Analytics dashboard (Astro SSR, Cloudflare Workers)
├── package.json          # Root workspace scripts
├── pnpm-workspace.yaml
└── CLAUDE.md
```

### Root workspace scripts
```bash
pnpm dev:landing          # Landing dev server (port 4321)
pnpm dev:dashboard        # Dashboard dev server (port 4322)
pnpm build:landing        # Build landing only
pnpm build:dashboard      # Build dashboard only
pnpm build                # Build both apps sequentially
pnpm deploy:landing       # wrangler deploy for landing
pnpm deploy:dashboard     # wrangler deploy for dashboard
pnpm check                # astro check both apps
pnpm typecheck            # tsc --noEmit both apps
```

---

## Landing page (`apps/landing`)

- **Framework:** Astro 6 with `output: 'static'`
- **Deployment:** Cloudflare Worker (static assets via `[assets]` binding)
- **Config:** `apps/landing/wrangler.toml` → `name = "berong-smp-landing"`
- **Deploy command:** `pnpm deploy:landing` (runs `wrangler deploy`)
- **Fonts:** Space Grotesk, Inter, JetBrains Mono (Google Fonts)
- **Styling:** Tailwind CSS + custom CSS variables in `src/styles/global.css`
- **Theme:** Supports light/dark mode via `html.dark` / `html.light` classes and CSS custom properties. Toggle is a React island (`ThemeToggle.tsx`).

---

## Dashboard (`apps/dashboard`)

### Deployment
- **Framework:** Astro 6 with `output: 'server'` (SSR)
- **Adapter:** `@astrojs/cloudflare` v13+ (requires Wrangler v4+)
- **Config:** `apps/dashboard/wrangler.toml`
  ```toml
  name = "berong-smp-dashboard"
  main = "@astrojs/cloudflare/entrypoints/server"
  compatibility_date = "2024-09-23"
  compatibility_flags = ["nodejs_compat"]
  [assets]
  directory = "./dist"
  binding = "ASSETS"
  ```
- **Deploy command:** `pnpm deploy:dashboard` (runs `wrangler deploy` from dashboard dir)
- **Dev server:** `http://localhost:4322`

### Key dependencies
- `@astrojs/cloudflare ^13.0.0` — SSR adapter
- `wrangler ^4.103.0` — required by `@cloudflare/vite-plugin` peer dep
- `@astrojs/react ^4.4.2`, `react ^18.3.1`, `react-dom ^18.3.1`
- `@astrojs/tailwind ^6.0.2`, `tailwindcss ^3.4.19`

### Pages (all using mock data)
Located in `apps/dashboard/src/pages/`:

- `index.astro` — Overview: KPI strip, preparedness distribution bar, recent sessions table (5 rows)
- `sessions/index.astro` — Sessions list: all 8 sessions with client-side filter pills (scenario type, prep level)
- `sessions/[id].astro` — Session detail: fullscreen 60/40 split, terminal event log left, stats/classifier signals/result right
- `roster.astro` — Roster: per-participant aggregated stats, cohort KPI strip, distribution bar, tier breakdown mini-badges

### Components
Located in `apps/dashboard/src/components/`:

- `EventLog.tsx` — React island, terminal-style auto-scroll log viewer
- `ThemeToggle.tsx` — React island, sun/moon icon toggle for light/dark mode (reads/writes `localStorage.theme`, syncs to `<html>` class)

### Layout
- `layouts/DashboardLayout.astro` — 220px sidebar shell + main slot
  - Inline theme loader script in `<head>` (prevents FOUC on page load)
  - Sidebar contains: logo, nav items, footer with status dot + `<ThemeToggle client:load />`
  - Loads: Google Fonts (Space Grotesk, Inter, JetBrains Mono) + Material Symbols Outlined (for ThemeToggle icons)

### Theme system (light/dark mode)
`styles/global.css` defines CSS custom properties under `:root, html.dark` and `html.light`:

**Key variables:**
- `--bg-base` — page background
- `--bg-sidebar` — sidebar background
- `--border-sidebar` / `--border-card` / `--border-table` — border colors
- `--text-brand` — accent green (`#88d982` dark / `#2e7d32` light)
- `--text-primary` / `--text-muted` / `--text-heading` — text hierarchy
- `--bg-log-panel` — event log terminal background
- `--text-log-prompt` / `--text-log-ts` / `--text-log-code` / `--text-log-msg` — log colors

Tier accent colors are **not** themed (always fixed):
- `#88d982` HIGH, `#c9a84c` MODERATE, `#c45c5c` LOW

Smooth transitions are applied to all structural elements via a universal transition rule in `global.css`.

### Assets
- `src/assets/images/` — contains `berong-elearning-logo.png` (used in sidebar brand), `berong-mascot.png`, and scene images (shared with landing)
- `public/` — `favicon.ico`, `favicon.png`, `favicon.svg` (copied from landing)

### Data layer
- `src/lib/mockData.ts` — 8 fictional sessions + 8 participants; all types and helper functions (`getParticipantStats`, `getTierCounts`, etc.)
- All dashboard pages operate against this mock data contract until real mod telemetry is wired in

### Design tokens
- Fonts: Space Grotesk (KPI/display), Inter (body), JetBrains Mono (labels/terminal)
- All custom CSS lives in `styles/global.css` — avoid Tailwind utility sprawl inline

---

## Master Plan

Full phased implementation plan lives in the **mod repo** at:
`C:\Users\dheyn\Documents\02_Dev\berongsmp-template-26.1.2\docs\major_plan.md`

Read that before starting any feature work. Dashboard work is Phase 2 in that plan.

---

## Data Flow (target after Phase 1+2)

```
Mod (Java) ──HTTP──► Turso (libSQL cloud)
                          │
Dashboard (CF Workers) ◄──┘  @libsql/client/web reads directly
```

**Turso sessions table columns (after Phase 1):**
```
id, student_name, student_id, section, station_account, account_uuid,
start_time, end_time, status, tutorial_completed, tutorial_duration_s,
simulation_type (FIRE|EARTHQUAKE), simulation_score, passed,
event_log (JSON array of SimEvent),
prep_level (HIGH|MODERATE|LOW — written by groupmate's RF script),
confidence (0.0–1.0), bfp_notes, notes
```

**Env vars needed in `.dev.vars` and Cloudflare dashboard:**
```
TURSO_URL=https://yourdb-yourorg.turso.io
TURSO_TOKEN=your-bearer-token
```

Access in SSR pages via `Astro.locals.runtime.env.TURSO_URL`.

---

## Current state of the integration (read before assuming anything exists)

**The mod does not currently send this repo anything.** Per the mod's own
CLAUDE.md, there is no webhook sender, no HTTP client, and no payload class
in the mod codebase. Architecture diagrams for this project describe a
fuller pipeline (behavioral telemetry → Postgres → feature engineering →
Random Forest preparedness classifier → adaptive feedback → dashboard), but
that's a target design, not a description of working code on either side.

Treat any FastAPI routes referenced below as **routes this repo should
define/build to match what the mod can actually send** — not routes
confirmed to be in active use. Before building against assumed payload
shapes, check the mod's `SimulationSession` for what data actually exists:
- `disasterType` (FIRE / EARTHQUAKE)
- session duration / timer ticks elapsed
- `firesExtinguishedCount` (FIRE sessions only)
- `magnitude`, `aftershockCount`, `aftershockMagnitudeScale`, final
  `EarthquakePhase` reached (EARTHQUAKE sessions only)
- player UUID, session start/end

There is currently **no per-tick decision/path-selection telemetry** in the
mod (no evacuation path choice, no panic proxy, no targeting accuracy/pin-
pull latency). If the ML feature set this repo wants (evacuation time,
decision delay, path efficiency, panic proxy, etc.) needs that granularity,
it has to be built as new instrumentation in the mod first.

---

## Target API surface (design intent — confirm before treating as real)
- A session-end endpoint receiving the fields listed above once the mod implements a sender
- Pre-test / post-test survey submission endpoints (if surveys are handled through this API rather than a separate form tool)
- A results endpoint for whatever consumes processed output (dashboard, possibly a companion app)

## ML / feature pipeline (intended, not yet fed real mod data)
Design docs describe: raw event traces → feature engineering → Random
Forest classifier → Preparedness Level (High/Moderate/Low) + feature
importance → feeds both an adaptive-feedback loop back to the mod and the
analytics dashboard. This can be built and tested against synthetic/sample
data, but flag clearly to the user when working with placeholder data versus
a real mod-sourced payload.

---

## Admin game commands relevant to dashboard testing

When testing the full session flow (mod → Turso → dashboard), these in-game commands are useful:

| Command | Effect |
|---|---|
| `/bfp bypass on` | Skip lobby gates (registration, active session, tutorial) for your player — lets you click fire/quake buttons instantly without completing onboarding. Resets on server restart. |
| `/bfp bypass off` | Re-enable gates (for testing the normal student flow). |
| `/bfp checkin <student_name>` | Create a session row so the dashboard can show the student. |
| `/bfp checkout` | Close the session row (writes end_time + score to Turso). |
| `/sim_fire` / `/sim_earthquake` | Start a simulation directly via command (also works without bypass). |

The typical quick-test loop: `/bfp bypass on` → click lobby button → simulate → `/bfp checkout` → check dashboard.

---

## When making API or pipeline changes
1. Check the mod repo's `SimulationSession` / `CLAUDE.md` for what fields actually exist before adding a route or feature that assumes more
2. If a new field is needed from the mod (e.g. evacuation path choice), say so explicitly — that's new mod-side instrumentation work, call it out as a cross-repo dependency rather than building around it silently
3. Keep mock/sample data clearly separated from anything wired to a real mod-side sender, once one exists

## When making dashboard changes
1. All styling changes go through `apps/dashboard/src/styles/global.css` CSS variables — do not add raw hardcoded hex colors to component files
2. Light/dark mode is controlled by the `html.dark` / `html.light` class — always test both modes when changing colors
3. The `ThemeToggle.tsx` component requires the Material Symbols Outlined font to be loaded in `DashboardLayout.astro`
4. New React islands must be added to `apps/dashboard/src/components/` and imported into the relevant `.astro` page
5. After any change, run `pnpm build:dashboard` to verify the Cloudflare SSR build compiles cleanly before pushing

---

## Dashboard Responsiveness & Theme Fix Log

> Micro-commit audit trail — each entry corresponds to one atomic git commit.

| # | Commit scope | What was fixed |
|---|---|---|
| 1 | `global.css` — CSS variables | Added missing `--bg-card`, `--text-secondary`, `--color-earthquake`, `--color-fire`, `--color-separator`, `--bg-notes-block`, `--text-notes-label`, `--text-notes-body`, `--text-id-cell`, `--text-section-cell`, `--text-pending`, `--text-no-data` to both dark and light themes |
| 2 | `global.css` — responsive shell | Added mobile/tablet breakpoints for `.dashboard-shell` grid and `.sidebar` collapse |
| 3 | `global.css` — KPI strip | Wrap KPI strip to grid on mobile; fix kpi-item min-width |
| 4 | `global.css` — filter bar | Add `flex-wrap: wrap` and tighten gaps on narrow viewports |
| 5 | `global.css` — page header | Reduce padding at tablet/mobile breakpoints |
| 6 | `global.css` — sessions table | Add horizontal scroll wrapper token and table overflow handling |
| 7 | `global.css` — dist-legend | Wrap legend items on mobile |
| 8 | `global.css` — hamburger/mobile sidebar toggle | Mobile sidebar slide-in overlay and hamburger button |
| 9 | `index.astro` — KPI scenario split | Replace hardcoded `#2a2a2a` separator and `#bfcaba` earthquake color with CSS variables |
| 10 | `index.astro` — sessions table inline styles | Replace hardcoded `#555`, `#888`, `#bfcaba`, `#333` inline styles with CSS variable classes |
| 11 | `sessions/index.astro` — table inline styles | Replace hardcoded hex colors in all td inline styles with CSS variable-backed classes |
| 12 | `sessions/[id].astro` — header/log inline styles | Replace `#555`, `#333`, `#444`, `#888` inline styles in session detail |
| 13 | `sessions/[id].astro` — BFP notes block | Replace hardcoded `#1a1a1a` block bg + text colors with CSS variables |
| 14 | `roster.astro` — KPI strip inline styles | Replace hardcoded `#383838`, `#333` with CSS variables |
| 15 | `roster.astro` — table inline styles | Replace hardcoded hex table cell colors with CSS variable classes |
| 16 | `global.css` — notes-input/save-btn | Fix `.notes-input` using undefined `--bg-card`, `.notes-save-btn` using undefined `--text-secondary` |
| 17 | `DashboardLayout.astro` — mobile overlay markup | Add hamburger toggle button and mobile sidebar overlay structure |
| 18 | `ThemeToggle.tsx` — icon color | Replace hardcoded `#bfcaba`/`#4a5240` icon colors with CSS currentColor via class |
| 19 | `data.astro` — style refactoring | Replace hardcoded and undefined colors with CSS variables, make download grid responsive |
| 20 | `commands.astro` — card refactoring | Replace hardcoded sidebar variables with themed card background variables |
| 21 | `global.css` & `guide.astro` | Resolve guide page horizontal overflow and improve mobile flowchart readability |
| 22 | `index.astro` — recent sessions table | Wrap recent sessions table in a scrollable container for mobile responsiveness |
| 23 | `sessions/index.astro` & `roster.astro` | Wrap tables in scrollable containers for mobile layout responsiveness |
| 24 | `global.css` — filter bar & pills | Make filter bars, groups, and pills responsive to prevent layout blowout |
| 25 | `global.css` — session detail layout | Make session detail split panels and header responsive for mobile stacking |
| 26 | Edit details & delete session | Added popup modals in detail view, styles in global.css, and API endpoints for edit/delete operations |
| 27 | Search bar | Added client-side search bars to filter tables in Sessions and Roster views, with styles in global.css |
| 28 | Sorting system | Added client-side table sorting (tableSorter.ts) with sortable headers, data-sort attributes, and CSS indicators across Overview, Sessions, and Roster tables |
| 29 | `login.astro` & `setup.astro` | Fix logo image rendering issue by using static `logo.src` instead of Astro `<Image>` optimization. |
| 30 | `setup.astro` | Redesign first-time setup page with glowing blobs, glassmorphic card, and custom status badge. |
| 31 | `login.astro` | Redesign admin sign-in page to match setup page visual style. |
| 32 | `login.astro` & `setup.astro` | Add interactive focus-highlighted Material Symbols Outlined icons inside inputs and button active scale effects. |
| 33 | `login.astro` & `setup.astro` | Improve layout responsiveness by removing body overflow restrictions, enabling vertical scrolling, adding padding, and floating the theme toggle in the top-right corner. |
| 34 | `astro.config.mjs` (landing) | Fix landing page image rendering by changing imageService to 'compile' for pre-optimized build-time WebP assets. |
| 35 | `DashboardLayout.astro` | Replace dashboard layout <Image> component with standard <img> using logo.src to prevent dynamic Cloudflare Image Resizing errors. |

---

## Comprehensive Evolution Log (Phase 3 — Multi-task implementation)

> These changes were implemented as a coordinated 16-task evolution of both apps.

| # | Task | What was changed |
|---|---|---|
| 16 | Shared Tailwind config | Created `tailwind.base.cjs` at monorepo root with shared colors, fonts, spacing, borderRadius tokens. Both `apps/landing/tailwind.config.cjs` and `apps/dashboard/tailwind.config.cjs` now extend this base via `require('../../tailwind.base.cjs')`. |
| 15 | Sitemap auto-generation | Landing already had `@astrojs/sitemap` configured. Added `site: 'https://dashboard.berongsmp.dev'` to `apps/dashboard/astro.config.mjs` for correct canonical URL generation. |
| 14 | ThemeToggle consolidation | Extracted shared theme logic into `src/lib/theme.ts` in both apps. Dashboard `ThemeToggle.tsx` and landing `ThemeToggle.astro` both import from the shared utility. FOUC prevention scripts in layouts reference the same `initTheme` serialized function. |
| 12 | Image optimization | Converted PNG logo usage in `DashboardLayout.astro` and `Navbar.astro` to use Astro's `<Image>` component for automatic WebP optimization. |
| 3 | DB error boundaries | Wrapped all DB queries in `index.astro`, `sessions/index.astro`, and `roster.astro` with try-catch. Added `ErrorCard.astro` component rendered on failure. |
| 5 | EventLog keyword filter | Added search input + keyword filtering inside `EventLog.tsx` React island. Filters across all log columns (timestamp, event code, message body). Match count badge displayed. |
| 11 | MC username validation | Added Minecraft username regex `^[a-zA-Z0-9_]{3,16}$` to `EnrollForm.tsx`. Inline error message on invalid input; submit disabled until valid. |
| 2 | Streaming CSV export | Refactored `/api/export/sessions` to stream CSV via `TransformStream` in 50-row chunks using paginated SQL queries. |
| 4 | Table pagination | Added `limit`/`offset` support to `getAllSessions` and `getRosterStats` in `queries.ts`. Sessions and Roster pages now show 25 rows per page with Prev/Next controls. |
| 9 | Audit trail logging | Created `audit_logs` table. `logAuditEvent` called from edit and delete API endpoints. Session detail view shows compact change history. **Migration required:** see SQL below. |
| 8 | Bulk actions | Added row checkboxes + bulk action toolbar to sessions table. New `POST /api/sessions/bulk-delete` endpoint for batch deletion. |
| 6 | Auto-polling live drills | Added 15-second `setInterval` on Overview page polling `/api/sessions/latest`. Updates recent sessions table in-place. Shows "Live" badge and last-updated timestamp. |
| 7 | Chart.js integration | Added `PrepChart.tsx` (doughnut) and `ScoreHistogram.tsx` (bar) React islands to Overview page. Chart.js loaded via CDN. Replaces static CSS distribution bar. |
| 13 | MC server status | New `GET /api/server-status` endpoint (landing app) proxies `api.mcsrvstat.us` with 60s cache. `ServerStatus.tsx` React island in Hero replaces static badge. |
| 10 | Native leads endpoint | Replaced external FastAPI `/leads` call with native Astro API route `apps/landing/src/pages/api/leads.ts` writing to Turso `leads` table. **Migration required:** see SQL below. |
| 1 | Dashboard authentication | Added middleware-based session auth (`src/middleware.ts`). Login page at `/login`. Sessions stored in `admin_sessions` table. **Migration required:** see SQL below. |

---

## Required Database Migrations (run in Turso console or via libSQL CLI)

### Task 9 — Audit logs table
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER,
  action       TEXT NOT NULL,       -- 'edit' | 'delete'
  changed_by   TEXT DEFAULT 'admin',
  changed_at   TEXT DEFAULT (datetime('now')),
  old_values   TEXT,                -- JSON string
  new_values   TEXT                 -- JSON string
);
```

### Task 10 — Landing leads table
```sql
CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL,
  email        TEXT NOT NULL,
  message      TEXT,
  submitted_at TEXT DEFAULT (datetime('now')),
  ip_hash      TEXT
);
```

### Task 1 — Auth tables (Updated for User Management)
```sql
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at   TEXT DEFAULT (datetime('now')),
  role         TEXT DEFAULT 'admin',
  status       TEXT DEFAULT 'pending'
);

-- Migration to add columns to existing table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin';
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'pending';

-- Make initial admin 'necookie' the owner & active
UPDATE users SET role = 'owner', status = 'active' WHERE lower(username) = 'necookie';
```

### Task 1 — Auth sessions table
```sql
CREATE TABLE IF NOT EXISTS admin_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  token        TEXT NOT NULL UNIQUE,
  created_at   TEXT DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL
);
```

### Task 1 — Seed initial admin user
On first deploy, visit `/login` and the system will detect no users exist. Navigate to `/setup` (only accessible when zero users exist) to create the first admin account (which will be initialized as `owner` and `active`).

