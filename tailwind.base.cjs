/** @type {import('tailwindcss').Config} */

/**
 * tailwind.base.cjs — Shared design tokens for the BERONG SMP monorepo.
 * Both apps (landing + dashboard) extend this base configuration.
 * 
 * Usage in each app:
 *   const base = require('../../tailwind.base.cjs');
 *   module.exports = { ...base, content: [...], theme: { extend: { ...base.theme.extend, /* app-specific * / } } };
 */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Surface layers (shared across both apps) ──────────────────────
        'surface':                   '#131313',
        'surface-dim':               '#131313',
        'surface-bright':            '#3a3939',
        'surface-container':         '#201f1f',
        'surface-container-low':     '#1c1b1b',
        'surface-container-high':    '#2a2a2a',
        'surface-container-highest': '#353534',
        'surface-container-lowest':  '#0e0e0e',
        'surface-deep':              '#0d0d0d',
        'surface-base':              '#121212',
        'surface-elevated':          '#1a1a1a',
        'surface-variant':           '#353534',
        'surface-tint':              '#e53935',

        // ── On-surface ────────────────────────────────────────────────────
        'on-surface':            '#e5e2e1',
        'on-surface-variant':    '#8a9ab8',
        'on-background':         '#e5e2e1',

        // ── Inverse ───────────────────────────────────────────────────────
        'inverse-surface':       '#e5e2e1',
        'inverse-on-surface':    '#313030',

        // ── Primary — BFP Red ─────────────────────────────────────────────
        'primary':               '#e53935',
        'on-primary':            '#ffffff',
        'primary-container':     '#b71c1c',
        'on-primary-container':  '#fee2e2',
        'inverse-primary':       '#991b1b',
        'primary-fixed':         '#fca5a5',
        'primary-fixed-dim':     '#e53935',

        // ── Secondary ─────────────────────────────────────────────────────
        'secondary':             '#f87171',
        'on-secondary':          '#7f1d1d',
        'secondary-container':   '#991b1b',
        'on-secondary-container':'#fecaca',

        // ── Preparedness tier colours (fixed, not themed) ─────────────────
        'tier-high':             '#22c55e',
        'tier-moderate':         '#f59e0b',
        'tier-low':              '#ef4444',

        // ── Error ─────────────────────────────────────────────────────────
        'error':                 '#ffb4ab',
        'on-error':              '#690005',
        'error-container':       '#93000a',
        'on-error-container':    '#ffdad6',

        // ── Structural ────────────────────────────────────────────────────
        'outline':               '#8a9485',
        'outline-variant':       '#40493d',
        'border-stone':          '#333333',

        // ── Custom brand / aliases ────────────────────────────────────────
        'experience-orb':        '#7cfc00',
        'text-obsidian':         '#888888',
        'muted-label':           '#555555',
        'console-base':          '#090909',
        'rule':                  '#2a2a2a',
        'background':            '#131313',
      },
      fontFamily: {
        // Primary aliases
        'headline':    ['"Space Grotesk"', 'sans-serif'],
        'display':     ['"Space Grotesk"', 'sans-serif'],
        'body':        ['Inter', 'sans-serif'],
        'mono':        ['"JetBrains Mono"', 'monospace'],
        // Extended aliases for landing page
        'headline-xl': ['"Space Grotesk"', 'sans-serif'],
        'headline-lg': ['"Space Grotesk"', 'sans-serif'],
        'body-md':     ['Inter', 'sans-serif'],
        'body-sm':     ['Inter', 'sans-serif'],
        'label-mono':  ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'headline-xl':          ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg':          ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'headline-lg-mobile':   ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-md':              ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm':              ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-mono':           ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
      },
      spacing: {
        'unit':           '4px',
        'gutter':         '16px',
        'margin-mobile':  '16px',
        'margin-desktop': '32px',
        'container-max':  '1200px',
      },
      maxWidth: {
        'container-max': '1200px',
      },
      // Sharp / pixel-perfect corners throughout both apps
      borderRadius: {
        'DEFAULT': '0px',
        'sm':      '0px',
        'md':      '0px',
        'lg':      '0px',
        'xl':      '0px',
        'full':    '9999px',
      },
    },
  },
  plugins: [],
};
