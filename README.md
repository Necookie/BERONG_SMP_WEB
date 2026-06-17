# BERONG SMP Monorepo

Monorepo containing the frontend web applications for the **BERONG SMP Training Portal** — a Minecraft-based disaster simulation platform for academic research in fire and earthquake safety protocols.

---

## Workspace Structure

This project is organized as a `pnpm` workspace under `/apps`:

| Directory | Application | Output Mode | Port | Description |
|---|---|---|---|---|
| [`apps/landing`](file:///c:/Users/dheyn/Documents/04_School/BERONG_SMP_WEB/apps/landing) | Landing Page | Static (`static`) | `4321` | Public marketing/landing page with registration forms. |
| [`apps/dashboard`](file:///c:/Users/dheyn/Documents/04_School/BERONG_SMP_WEB/apps/dashboard) | Dashboard | Server-Side (`server`) | `4322` | Authenticated student/researcher portal (Astro SSR via `@astrojs/node`). |

---

## Local Development

### Prerequisites

- **Node.js** ≥ 22.12.0
- **pnpm** ≥ 9

### Getting Started

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Run the applications in development mode
pnpm dev:landing      # Runs landing page on http://localhost:4321
pnpm dev:dashboard    # Runs dashboard on http://localhost:4322
```

---

## Workspace Commands

The following commands can be executed from the root directory:

```bash
# Runs dev servers
pnpm dev:landing
pnpm dev:dashboard

# Compiles production builds
pnpm build:landing
pnpm build:dashboard
pnpm build            # Builds both applications

# Runs quality checks and type-checking workspace-wide
pnpm check            # Runs astro check on both projects
pnpm typecheck        # Runs tsc --noEmit on both projects
```

---

## Landing Page (`apps/landing`)

### Environment Variables

All env vars consumed by the landing application are documented in [`apps/landing/.env.example`](file:///c:/Users/dheyn/Documents/04_School/BERONG_SMP_WEB/apps/landing/.env.example).

| Variable | Required | Description |
|---|---|---|
| `PUBLIC_API_BASE_URL` | Yes (for form) | Base URL of the FastAPI backend, **without trailing slash**. E.g. `https://api.berongsmp.dev` |

### Design System (Obsidian Grid)

Design tokens are defined in [`apps/landing/tailwind.config.cjs`](file:///c:/Users/dheyn/Documents/04_School/BERONG_SMP_WEB/apps/landing/tailwind.config.cjs) and sourced from the Stitch **Obsidian Grid** design system.

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

Custom CSS classes (`.stone-border`, `.mc-button`, `.glass-panel`) are defined in [`apps/landing/src/styles/global.css`](file:///c:/Users/dheyn/Documents/04_School/BERONG_SMP_WEB/apps/landing/src/styles/global.css).
