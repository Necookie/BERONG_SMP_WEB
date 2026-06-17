# Asset Manifest — BERONG SMP Landing Page

All images downloaded from Stitch project `2805614016152015745`, screen `da9ed672cdb04d9fa7c5f65253e5e080`.

| Local File | Source URL (Stitch CDN) | Used In |
|---|---|---|
| `src/assets/images/hero-background.jpg` | `https://lh3.googleusercontent.com/aida-public/AB6AXuCb83qMqeD8r9Kubrt6b1vtVNS...` | `Hero.astro` — full-bleed background image (opacity 40%, luminosity blend) |
| `src/assets/images/fire-extinguisher-sim.jpg` | `https://lh3.googleusercontent.com/aida-public/AB6AXuDe3SjsnnBys-YWRaXiNRr7vI6...` | `About.astro` — right-column simulation screenshot; `Gallery.astro` — thermal protocol small slot |
| `src/assets/images/gallery-staging-lobby.jpg` | `https://lh3.googleusercontent.com/aida-public/AB6AXuBDyDD3YHPF7v0tCmLx09-l192...` | `Gallery.astro` — large 8-column featured image (Central Staging Area) |
| `src/assets/images/gallery-seismic-event.jpg` | `https://lh3.googleusercontent.com/aida-public/AB6AXuAefaT7Z4w1HGegM0KrBWxfhLi...` | `Gallery.astro` — small right-column image (Seismic Event label) |
| `src/assets/images/berong-smp-logo.png` | Extracted from base64 data-URI in stitch-export-raw.html | `Navbar.astro` — brand logo in the top-left |

## Notes

- All images are served through Astro's `<Image />` component for automatic format optimisation and layout-shift prevention (explicit `width`/`height` on every image).
- Original resolution is preserved; Astro applies lossy compression at build time (quality 85 for hero, default for others).
- The CDN URLs above should be treated as ephemeral; the locally downloaded copies in `src/assets/images/` are the canonical source for the build.
