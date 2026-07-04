# Berong SafeScape – UI Style Guide

> Use this document as a prompt when working with an AI assistant to maintain consistent styling across the application.

---

## 1. Design Philosophy

- **Target audience:** Kids and young learners — the UI must feel **playful, friendly, and interactive**.
- **Aesthetic:** Cartoonish, colorful, rounded — inspired by educational platforms like Kahoot and Blooket.
- **Interactions:** All clickable elements should feel like physical, tactile buttons (3D press effect).
- **Animations:** Use subtle, delightful micro-animations (floating, bouncing) to keep the interface feeling alive. **No sound effects.**

---

## 2. Typography

| Property | Value |
|---|---|
| **Font Family** | `Fredoka` (Google Fonts) — rounded, playful, kid-friendly |
| **Weights Used** | 300, 400, 500, 600, 700 |
| **Configured In** | `app.blade.php` (Google Fonts link), `app.css` (`--font-sans` in `@theme inline`), `tailwind.config.js` |

### Loading
```html
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### CSS Variable (Tailwind v4)
```css
@theme inline {
  --font-sans: "Fredoka", ui-sans-serif, system-ui, sans-serif;
}
```

---

## 3. Color Palette

| Role | Color | Hex / Tailwind Class |
|---|---|---|
| **Primary Red** | BFP Red | `#ff4b3e` / gradient `from-[#ff4b3e] to-[#ff8c00]` |
| **Accent Yellow** | Active buttons, highlights | `bg-yellow-400` (#FACC15) |
| **Dark Blue** | Footer, Partnership section | `bg-[#1e293b]` / `#111827` |
| **Text on Red** | Button labels on yellow bg | `text-red-600` |
| **White** | Borders, text on dark bg | `text-white`, `border-white` |
| **Orange** | Subtitle accent | `text-orange-500` |
| **Gradient Header** | Navigation bar | `bg-gradient-to-r from-red-600 via-orange-500 to-orange-400` |

---

## 4. Button System — 3D Physical Press Effect

All primary buttons use a **box-shadow + translateY** technique to simulate a physical button press.

### Yellow Buttons (Dashboard, Sign In)
```
Default:  shadow-[0_4px_0_#b45309]
Hover:    -translate-y-0.5  shadow-[0_6px_0_#b45309]
Active:   translate-y-1     shadow-[0_0px_0_#b45309]
```
Full class string:
```
bg-yellow-400 border-[3px] border-white text-red-600 font-extrabold
px-6 py-1.5 rounded-full
shadow-[0_4px_0_#b45309]
hover:-translate-y-0.5 hover:shadow-[0_6px_0_#b45309]
active:translate-y-1 active:shadow-[0_0px_0_#b45309]
transition-all text-sm tracking-wide uppercase
```

### Red Buttons (Settings/About icon)
```
Default:  shadow-[0_4px_0_#9f1239]
Hover:    -translate-y-0.5  shadow-[0_6px_0_#9f1239]
Active:   translate-y-1     shadow-[0_0px_0_#9f1239]
```
Full class string:
```
bg-[#e11d48] border-[3px] border-white text-white rounded-full p-2
shadow-[0_4px_0_#9f1239]
hover:-translate-y-0.5 hover:shadow-[0_6px_0_#9f1239]
active:translate-y-1 active:shadow-[0_0px_0_#9f1239]
transition-all
```

---

## 5. Navigation Header

| Property | Value |
|---|---|
| **Background** | `bg-gradient-to-r from-red-600 via-orange-500 to-orange-400` |
| **Height** | `py-2 sm:py-3` |
| **Logos** | BFP logo + Berong logo side by side, both circular with `rounded-full` |
| **Dashboard Link** | Active = yellow pill with 3D shadow. Inactive = plain white text only |
| **Sign In** | Yellow pill with 3D shadow (right side) |
| **Settings (About)** | Red circle icon with 3D shadow |
| **Date/Time** | White text, right-aligned, `text-xs` |

---

## 6. Hero Carousel

| Property | Value |
|---|---|
| **Overlay** | `bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent` |
| **Text Position** | Bottom-left (`justify-end items-start`) |
| **Title** | Dynamic from `image.title`, `text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black` |
| **Description** | Dynamic from `image.altText`, `text-base sm:text-xl md:text-2xl` |
| **No signup button** | The carousel contains images and text only — no CTA buttons |

---

## 7. Meet Berong Section

| Property | Value |
|---|---|
| **Background** | `bg-white/95 backdrop-blur-sm`, rounded card with border |
| **Layout** | Logo (45%) + Text (55%) side by side on desktop, stacked on mobile |
| **Mascot Animation** | Infinite vertical float (`y: [-12, 12, -12]`, 4s ease-in-out loop) |
| **Mascot Shadow** | Dynamic `drop-shadow` that shifts with the float animation |
| **Badge** | `bg-red-100 text-red-600` pill label — "About SafeScape" |
| **Title** | `Meet <span class="text-red-500">Berong</span>` |
| **Subtitle** | `text-orange-500` — "Your Fire Safety Companion" |

---

## 8. Partnership Section

| Property | Value |
|---|---|
| **Background** | `bg-[#1e293b]` dark blue, `rounded-[2.5rem]` |
| **Padding** | `py-10 sm:py-14` (compact to fit viewport) |
| **Cards** | `bg-[#1e293b]` with `border-slate-700`, `p-5 sm:p-6`, `rounded-2xl` |
| **Logos** | `w-14 h-14 sm:w-16 sm:h-16` |
| **Text** | `text-sm`, `text-gray-300` body, `text-white` headings |
| **Advisor boxes** | `bg-white/5` with `border-white/10`, yellow icon accent |

---

## 9. Footer

| Property | Value |
|---|---|
| **Background** | `bg-[#111827]` (very dark blue) |
| **Logo** | Berong Mascot logo, prominent |
| **Text** | White / gray-400, small font sizes |

---

## 10. Key Animation Patterns

### Floating Effect (Mascot)
```tsx
animate={{
  y: [-12, 12, -12],
  filter: [
    "drop-shadow(0px 30px 25px rgba(0,0,0,0.15))",
    "drop-shadow(0px 10px 10px rgba(0,0,0,0.35))",
    "drop-shadow(0px 30px 25px rgba(0,0,0,0.15))"
  ]
}}
transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
```

### Section Scroll Fade
```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.95, 1, 1, 0.95]);
```

---

## 11. Tech Stack & Build Notes

| Item | Detail |
|---|---|
| **Framework** | Laravel + Inertia.js + React (TSX) |
| **CSS** | Tailwind CSS **v4** (uses `@theme inline` in `app.css`, NOT `tailwind.config.js` for theme) |
| **Animations** | Framer Motion (`motion` components) |
| **Icons** | Lucide React |
| **Images** | Standard `<img>` tags (NOT a custom `<Image>` component — causes build errors) |
| **Build** | `npm run build` (Vite) — must rebuild after every change when running on Laravel server |
| **Dev Server** | `npm run dev` for hot reload, or `npm run build` + hard refresh |

---

## 12. Common Pitfalls

1. **Do NOT use `<Image>` from `@/components/Image`** — it has broken props. Always use `<img>`.
2. **Always run `npm run build`** after UI changes if the Vite dev server is not running.
3. **Tailwind v4 theme** goes in `app.css` `@theme inline {}`, not in `tailwind.config.js`.
4. **Hard refresh (Ctrl+F5)** is required after rebuilding to see changes.
