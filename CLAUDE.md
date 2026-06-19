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
