# BERONG SMP Landing Page

Public marketing/landing page for the **BERONG SMP Training Portal** — a Minecraft-based disaster simulation platform for academic research in fire and earthquake safety protocols.

Built with **Astro** (static-first), **React** (interactive islands only), and **Tailwind CSS** (Obsidian Grid design system).

---

## Local Development

### Prerequisites

- Node.js ≥ 22.12.0
- npm ≥ 10

### Setup

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Copy env file and configure
cp .env.example .env
# Edit .env and set PUBLIC_API_BASE_URL

# 3. Start dev server
npm run dev
```

The dev server runs at **http://localhost:4321** by default.

---

## Environment Variables

All env vars consumed by this app are documented in [`.env.example`](.env.example).

| Variable | Required | Description |
|---|---|---|
| `PUBLIC_API_BASE_URL` | Yes (for form) | Base URL of the FastAPI backend, **without trailing slash**. E.g. `https://api.berongsmp.dev` |

> **Note:** Variables prefixed with `PUBLIC_` are exposed to the browser bundle. Never put secrets here.

### Per-Environment Configuration

| Environment | Value |
|---|---|
| Local dev | `http://localhost:8000` |
| Staging | `https://api-staging.berongsmp.dev` |
| Production | `https://api.berongsmp.dev` |

Set the variable in your CI/CD pipeline or hosting platform (e.g. Vercel, Netlify environment variables panel) — **do not commit a `.env` file with real values**.

---

## Build

```bash
npm run build
```

Output goes to `dist/`. This is a fully static site (Astro `output: 'static'`). Deploy the `dist/` directory to any static host (Vercel, Netlify, Cloudflare Pages, nginx).

---

## Project Structure

```
src/
├── components/
│   ├── astro/          # Static Astro components (no client JS)
│   │   ├── Navbar.astro
│   │   ├── Hero.astro
│   │   ├── About.astro
│   │   ├── Features.astro
│   │   ├── Timeline.astro
│   │   ├── Gallery.astro
│   │   ├── Rules.astro
│   │   ├── EnrollSection.astro
│   │   └── Footer.astro
│   └── react/          # React islands (client-side hydration)
│       ├── MobileMenu.tsx   — client:visible
│       └── EnrollForm.tsx   — client:visible
├── layouts/
│   └── BaseLayout.astro    # <head> meta, fonts, OG tags
├── pages/
│   └── index.astro         # Page entry point
├── lib/
│   └── api.ts              # Typed fetch wrapper for FastAPI
├── styles/
│   └── global.css          # Tailwind directives + custom component classes
└── assets/
    └── images/             # Downloaded from Stitch design
```

---

## Design System

Design tokens are defined in [`tailwind.config.cjs`](tailwind.config.cjs) and sourced verbatim from the Stitch **Obsidian Grid** design system (project `2805614016152015745`).

Key tokens:

| Token | Value | Usage |
|---|---|---|
| `primary` | `#88d982` | CTAs, active states, borders |
| `surface-deep` | `#0d0d0d` | Page canvas (+ 16px dot grid) |
| `surface-elevated` | `#1a1a1a` | Card backgrounds |
| `experience-orb` | `#7cfc00` | Status indicators |
| `font-headline` | Space Grotesk | All headings |
| `font-body` | Inter | Body copy |
| `font-mono` | JetBrains Mono | Labels, badges, code |

Custom CSS classes (`.stone-border`, `.mc-button`, `.glass-panel`) are defined in [`src/styles/global.css`](src/styles/global.css).

---

## Quality Checks

```bash
npm run check      # astro check (zero errors required)
npm run typecheck  # tsc --noEmit (zero errors required)
npm run build      # production build
```

---

## Design Reference

The raw Stitch export is saved at [`design/stitch-export-raw.html`](design/stitch-export-raw.html) — **never import this file into the app**. It is reference only.

Image sources are documented in [`design/asset-manifest.md`](design/asset-manifest.md).
