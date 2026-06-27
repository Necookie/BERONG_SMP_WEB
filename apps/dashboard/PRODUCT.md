# Product

## Register

product

## Users

Faculty researchers, BFP evaluators, and a small set of technical admins who review simulation session data after drills. One or two people per institution, not a team of analysts. They run sessions during class hours and return to the dashboard within minutes or hours to check results.

Primary context: faculty member opens the dashboard on a laptop in a fluorescent-lit classroom or office, often while students are still present. They want to see who passed, who didn't, and why — without needing to decode a raw event log. They may also present the dashboard on a projected screen during debriefs.

Secondary context: the system admin (owner role) occasionally reviews audit trails, manages users, or downloads raw CSV exports for the ML pipeline.

## Product Purpose

The BERONG SMP dashboard is the analytical layer for the disaster simulation. It reads session data directly from Turso (libSQL) and surfaces preparedness levels, event logs, movement maps, and rubric signals in a reviewable interface.

Success looks like: a faculty member finishes a 45-minute drill session, opens the dashboard, and within 90 seconds can name every student's preparedness tier, identify who failed to activate the fire alarm, and pull up that student's movement trace — all without touching the raw CSV.

## Brand Personality

Playful · Immersive · Educational

The dashboard is the data face of the same platform as the landing page. The brand personality carries over, but expression shifts: where the landing page is immersive and visual, the dashboard is precise and legible. The Minecraft-adjacent aesthetic (dark terminal palette, green accent, monospace labels, sharp borders) is what visually connects the tool to the game — it should feel like looking at a server console, not a corporate BI tool.

Copy is terse and specific. Labels are facts, not marketing. "HIGH preparedness" not "Excellent performance ✓".

## Anti-references

- **Generic SaaS dashboard**: Stripe, Linear, Vercel, Notion analytics. Blue-purple gradients, hero-metric template (big number + supporting stats), identical card grids, shadow-heavy surfaces. Nothing about BERONG SMP maps to the SaaS aesthetic.
- **Philippine government web portal**: Low-contrast tables, serif-heavy official layouts, badge-and-seal hierarchy. The platform is deployed for an academic context, not a regulatory one.

## Design Principles

1. **Data at a glance, depth on demand** — every screen leads with the answer (tier, pass/fail, score). Details (event log, movement map, rubric signals) exist one interaction away, not buried in tabs three levels deep.
2. **The terminal is first-class** — the event log and raw session playback are not secondary tools for power users. They are the primary research instrument. Design must treat them with the same priority as the KPI strip.
3. **Both themes are production-ready** — dark is the natural state for focused analysis. Light must be equally polished for projected debriefs and faculty reviews. Neither theme is a fallback.
4. **No decoration that doesn't communicate** — every color, border, icon, and badge earns its place by transmitting information about a session, student, or system state. Decoration that does not communicate is noise in a research tool.
5. **Precision over personality** — in the product register, legibility wins over visual interest. Typography, spacing, and layout decisions are made by asking "does this make the data clearer?" not "does this look good?"

## Accessibility & Inclusion

WCAG 2.1 AA minimum. Key considerations:
- Preparedness tiers (HIGH / MODERATE / LOW) are never color-only — always paired with the text label
- Table cells with color-coded values must have sufficient contrast in both themes
- Keyboard navigation for all interactive elements: filter pills, sort headers, pagination, modal dialogs, bulk action toolbar
- Reduced-motion alternative for all animations (MapPlayer playback, live-poll badge pulse)
- The dashboard is used on projected screens — high contrast and large touch targets matter even on desktop
- Admin interfaces (user management, edit/delete modals) must be operable without a mouse
