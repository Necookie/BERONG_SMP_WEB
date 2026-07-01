# BERONG SMP Dashboard — UI Style Guide

> Use this document as a prompt when working with an AI assistant to maintain consistent styling across `apps/dashboard`. Scope: the Web Analytics Dashboard only — the public landing page (`apps/landing`) shares the theme mechanism and font stack but uses a different (green/black pixel) visual language and is out of scope here.

---

## 1. Design Philosophy

- **Target audience:** BFP officers and LSPU faculty reviewing drill telemetry — the UI must feel **data-dense, precise, and trustworthy**, not playful.
- **Aesthetic:** Terminal / mission-control. Monospace labels, hairline borders, flat surfaces, restrained color use. Think ops dashboards, not marketing sites.
- **Interactions:** Buttons and pills use a **3D physical press effect** (see §4) — the one place this UI allows a tactile flourish.
- **Minimalism:** No decorative gradients, no drop shadows beyond the 3D-press effect, no card glow. Structure comes from spacing and hairline borders, not color.

---

## 2. Typography

| Role | Font | Where |
|---|---|---|
| Headings / KPI numbers / brand wordmark | `Space Grotesk` (400–700) | `.page-title`, `.kpi-value` |
| Body text | `Inter` (400–600) | default `body` font |
| Labels / mono data / terminal UI | `JetBrains Mono` (400–500) | `.page-meta`, `.section-label`, table headers, badges, sidebar labels |

Loaded once via `@import` at the top of `src/styles/global.css`. Never inline a `<link>` to Google Fonts on individual pages — `DashboardLayout.astro` also loads Material Symbols Outlined for all icon glyphs used app-wide.

---

## 3. Color System — CSS custom properties only

**Never hardcode hex colors in a component.** All color lives in `:root, html.dark { ... }` and `html.light { ... }` in `global.css`. Theme is toggled by adding `dark`/`light` to `<html>` (see `ThemeToggle.tsx` + the inline FOUC-prevention script in `DashboardLayout.astro`'s `<head>`).

| Variable | Role |
|---|---|
| `--bg-base` | page background |
| `--bg-sidebar` | sidebar background (subtly darker/cooler than `--bg-base`) |
| `--bg-card` | card/panel surfaces |
| `--bg-table-hover` | row hover, neutral hover fills |
| `--border-card` / `--border-sidebar` / `--border-table` | hairline dividers |
| `--text-primary` / `--text-secondary` / `--text-muted` / `--text-heading` | text hierarchy, darkest → lightest emphasis |
| `--text-brand` | accent color — **red** (`#e53935` dark / `#dc2626` light), used for active states, primary links, brand wordmark |
| `--text-brand-sub` | secondary/muted brand tone (also reused as the neutral scrollbar-thumb tint) |
| `--color-fire` / `--color-earthquake` | scenario-type accent colors (fire = brand red, earthquake = slate) |

**Status colors** (success/warning/danger), each with a translucent bg + border variant for pill/badge treatments:
```
--text-success / --bg-success-translucent / --border-success-translucent
--text-warning / --bg-warning-translucent / --border-warning-translucent
--text-danger  / --bg-danger-translucent  / --border-danger-translucent
```
Use these for status pills (`.status-pill`, `.user-action-btn`), not ad hoc `rgba()`.

**Tier accent colors are NOT themed** — always fixed regardless of dark/light mode, since they encode a fixed semantic meaning (preparedness level):
```
#22c55e  HIGH
#f59e0b  MODERATE
#ef4444  LOW
```

**Radii** (also themed vars, same values in both modes):
```
--radius-card: 8px   --radius-button: 8px   --radius-input: 6px
--radius-badge: 4px  --radius-modal: 12px
```

---

## 4. Button System — 3D Physical Press Effect

Used for filter pills, action buttons, pagination, download cards. Box-shadow + translateY, not a gradient or scale transform:

```css
.el {
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
  transition: box-shadow 0.15s, transform 0.1s;
}
.el:hover  { transform: translateY(-2px); box-shadow: 0 6px 0 rgba(0, 0, 0, 0.25); }
.el:active { transform: translateY(4px);  box-shadow: 0 0px 0 rgba(0, 0, 0, 0.25); }
```
Examples in the codebase: `.filter-pill`, `.pagination-btn`, `.download-card`, `.user-action-btn`, `.btn-bulk-delete`.

Icon-only utility buttons (theme toggle, sidebar collapse, logout) skip the 3D press — they use a plain `color`/`background-color` transition instead. Reserve the 3D effect for elements the user thinks of as "an action," not passive icon toggles.

---

## 5. Motion System

Shared easing/duration tokens, defined once under a `:root` block in the "Motion System" section of `global.css` — reference them, don't invent new durations:

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);

--dur-instant: 100ms;  --dur-fast: 160ms;
--dur-base:    220ms;  --dur-slow: 320ms;
```
- `--dur-fast` + `--ease-out-quart` — color/background hover transitions.
- `--dur-base` + `--ease-out-expo` — layout transitions (sidebar collapse, grid-template-columns, max-width fades).
- Any persisted UI toggle (theme, sidebar collapsed, Basic/Advanced view) needs a matching **inline FOUC-prevention script** in `DashboardLayout.astro`'s `<head>` that reads `localStorage` and applies the class before first paint — see the three existing examples there before adding a fourth.
- Respect `prefers-reduced-motion: reduce` — the global override at the bottom of `global.css` zeroes all animation/transition durations; don't fight it with per-component `!important` overrides that lack a duration.

---

## 6. Layout & Spacing Scale

Page content uses a consistent 3-tier responsive padding scale — reuse it instead of inventing new numbers:

| Breakpoint | Horizontal padding | Notes |
|---|---|---|
| Desktop (default) | `40px` | `.page-header`, `.sessions-section`, `.dist-section`, `.data-page-content` |
| ≤1024px | `28px` | |
| ≤600px | `20px` | ≤768px also adds `padding-top: 60px` where a page-header sits under the mobile hamburger bar |

Vertical rhythm between major page sections (KPI strip, chart cards, analytics grid) is **24px** desktop / **20-22px** tablet / **16px** mobile. Put the margin on the section that needs separation from *whatever follows it* (e.g. `.kpi-strip { margin-bottom }`), not on the next element's `margin-top` — the next element varies per page and can't be relied on to compensate.

Cards: `background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-card);` — no shadow, no gradient.

---

## 7. Sidebar (`DashboardLayout.astro` + `global.css` "Sidebar" / "Collapsible sidebar" sections)

- **Nav items**: inset rounded pills (`margin: 2px 12px; border-radius: var(--radius-button);`), not full-bleed rows with a colored left border — that reads as a generic admin template. Active = `background: var(--bg-filter-pill-active); color: var(--text-brand);`. Hover = neutral `var(--bg-table-hover)` tint.
- **Icons**: every nav item has a Material Symbols Outlined icon (`.nav-icon`); inherits color from `.nav-item` via `currentColor`, don't set icon color separately.
- **Collapsible**: desktop-only (`≥769px`) circular toggle (`.sidebar-collapse-btn`, `position:fixed` so it isn't clipped by the sidebar's own `overflow-y:auto`), collapses `.dashboard-shell`'s `grid-template-columns` from `220px 1fr` to `64px 1fr`. Any sidebar text that must vanish on collapse gets the shared `.sidebar-collapsible-text` class (`opacity` + generous `max-width` cap transition — CSS can't animate to/from `auto`, so cap at a safe fixed value like `200px` instead of measuring exact content width).
- **Footer**: compact account row (icon + stacked name/role + icon-only logout), not a bordered badge block. Keep footer chrome minimal — this is the one part of the sidebar most likely to feel "busy" if over-decorated.
- No "Navigation" section label above a single flat nav group — redundant with self-explanatory icons+labels. Only add a group label if there are ever 2+ distinct nav groups.

---

## 8. Tables

`.sessions-table` (aliased by `.roster-table`) is the canonical table treatment: hairline `border-bottom` rows, `JetBrains Mono` uppercase headers, no vertical borders, no zebra striping, hover = `--bg-table-hover`. Wrap in `.table-scroll-wrap` for horizontal overflow on narrow viewports. Sortable headers get `th.sortable` + a `data-sort-key`, wired via `src/lib/tableSorter.ts` — don't hand-roll a second sorting implementation.

Status/tier cells use `.tier-badge.{high,moderate,low}` (dot + label) or the themed `.status-pill.{active,pending,suspended}` — never inline `style="color:#22c55e"`.

---

## 9. Charts (Recharts)

All charts (`PrepChart`, `ScoreHistogram`, `ScoreTrendChart`, `ScenarioComparisonChart`, `PrepByScenarioChart`, `SectionPerformanceChart`, `SafetyBehaviorChart`, `EvacuationTimeChart`) follow the same conventions:
- `ResponsiveContainer` inside a fixed-height wrapper div (never let a chart's height be implicit).
- Axis ticks, grid lines, and tooltip chrome use CSS variables passed as literal prop values — e.g. `fill="var(--text-muted)"`, `stroke="var(--border-card)"` — **not** hex. SVG presentation attributes support `var()` in this codebase's target browsers (confirmed working via `MapPlayer.tsx`'s SVG paths), so this keeps charts theme-reactive without per-theme branching in the component.
- Tooltip `contentStyle` always uses `var(--bg-card)` / `var(--border-card)` / `var(--radius-card)` / JetBrains Mono, matching every other floating UI surface.
- Tier-level series (HIGH/MODERATE/LOW) use the fixed, unthemed tier hex colors from §3, never CSS vars — they must stay semantically constant across themes.
- Generic single-series bars/lines use `var(--text-brand)`; fire/quake comparisons use `var(--color-fire)` / `var(--color-earthquake)`.
- `isAnimationActive={false}` on all series — this app relies on its own CSS entrance animations (`dash-up`/`dash-fade`) for the surrounding layout; double animation reads as janky.
- Charts that live inside a toggleable/collapsible section (`.advanced-only`, sidebar collapse) need a `window.dispatchEvent(new Event('resize'))` nudge after the toggle, since `ResponsiveContainer` measures `display:none` ancestors as zero-size at mount.

---

## 10. Scrollbars

Custom thin scrollbars are defined once, globally, in the "Scrollbars" section of `global.css` (`*::-webkit-scrollbar` + `html { scrollbar-width: thin; scrollbar-color: ... }`). Don't add per-component scrollbar CSS — the global rule already covers every `overflow: auto/scroll` container (sidebar, tables, code panels) since `::-webkit-scrollbar` pseudo-elements don't cascade and must be targeted with a universal selector.

---

## 11. Common Pitfalls

1. **No hardcoded hex colors in component files.** If a color isn't already a CSS variable, add one to both `:root, html.dark` and `html.light` blocks rather than inlining `rgba()`/hex — the one standing exception is the fixed tier colors (§3) and the neutral scrollbar tint, which are intentionally unthemed.
2. **Always test both `html.dark` and `html.light`** after any color/border change.
3. **Editing `DashboardLayout.astro` needs a dev-server restart, not just a save.** Vite's file watcher has silently missed changes to this specific file more than once this project — after editing it, kill and restart `pnpm dev:dashboard` rather than trusting HMR.
4. **New client-side React islands use `client:only="react"`**, not `client:load` — this codebase's charts and interactive widgets are not SSR-safe (DOM measurement on mount).
5. **Run `pnpm build:dashboard`** after any non-trivial change to confirm the Cloudflare SSR build still compiles before considering the change done.
