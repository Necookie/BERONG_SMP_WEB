# BERONG SMP Web (Astro monorepo: landing page + dashboard)

## Paired repo
NeoForge mod (BerongSMP) at:
C:\Users\dheyn\Documents\02_Dev\berongsmp-template-26.1.2

## System role
This repo hosts:
1. The public landing page (Astro + React islands, green/black pixel aesthetic)
2. The DRR API service (FastAPI) — intended backend for the mod and any
   companion app
3. The Web Analytics Dashboard — intended oversight view for BFP officers/
   teachers/admins

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
it has to be built as new instrumentation in the mod first — don't build
feature-engineering code here that assumes input fields the mod can't
currently produce.

## Target API surface (design intent — confirm before treating as real)
- A session-end endpoint receiving the fields listed above once the mod
  implements a sender
- Pre-test / post-test survey submission endpoints (if surveys are handled
  through this API rather than a separate form tool)
- A results endpoint for whatever consumes processed output (dashboard,
  possibly a companion app)

## ML / feature pipeline (intended, not yet fed real mod data)
Design docs describe: raw event traces → feature engineering → Random
Forest classifier → Preparedness Level (High/Moderate/Low) + feature
importance → feeds both an adaptive-feedback loop back to the mod and the
analytics dashboard. This can be built and tested against synthetic/sample
data, but flag clearly to the user when working with placeholder data versus
a real mod-sourced payload.

## Dashboard
Intended to render preparedness scores, performance summaries, and
session-level data for BFP/teacher/admin oversight. Built with React islands
inside Astro pages. Until real session data flows in, treat any dashboard
work as building against a defined-but-currently-mocked data contract.

### Dashboard pages (all built, all using mock data)
Located in `apps/dashboard/src/`:

- `pages/index.astro` — Overview: KPI strip, preparedness distribution bar,
  recent sessions table (5 rows)
- `pages/sessions/index.astro` — Sessions list: all 8 sessions in a table
  with client-side filter pills (by scenario type and prep level)
- `pages/sessions/[id].astro` — Session detail: fullscreen 60/40 split,
  terminal event log left, stats/classifier signals/result right
- `pages/roster.astro` — Roster: per-participant aggregated stats, cohort
  KPI strip, distribution bar, tier breakdown mini-badges

### Dashboard design tokens
- `styles/global.css` — all custom CSS classes; avoid Tailwind utility sprawl
- `lib/mockData.ts` — 8 fictional sessions + 8 participants; all types and
  helper functions live here (`getParticipantStats`, `getTierCounts`, etc.)
- `layouts/DashboardLayout.astro` — sidebar shell (220px), slot for main
- `components/EventLog.tsx` — React island, terminal-style auto-scroll log
- Color tokens: `#88d982` HIGH, `#c9a84c` MODERATE, `#c45c5c` LOW
- Fonts: Space Grotesk (KPI/display), Inter (body), JetBrains Mono (labels/terminal)

## When making API or pipeline changes
1. Check the mod repo's `SimulationSession` / `CLAUDE.md` for what fields
   actually exist before adding a route or feature that assumes more
2. If a new field is needed from the mod (e.g. evacuation path choice),
   say so explicitly — that's new mod-side instrumentation work, call it
   out as a cross-repo dependency rather than building around it silently
3. Keep mock/sample data clearly separated from anything wired to a real
   mod-side sender, once one exists
