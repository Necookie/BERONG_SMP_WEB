/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surface layers (Obsidian Grid)
        'surface':                  '#131313',
        'surface-dim':              '#131313',
        'surface-bright':           '#3a3939',
        'surface-container':        '#201f1f',
        'surface-container-low':    '#1c1b1b',
        'surface-container-high':   '#2a2a2a',
        'surface-container-highest':'#353534',
        'surface-container-lowest': '#0e0e0e',
        'surface-deep':             '#0d0d0d',
        'surface-base':             '#121212',
        'surface-elevated':         '#1a1a1a',
        'surface-variant':          '#353534',
        'surface-tint':             '#88d982',
        // On-surface
        'on-surface':               '#e5e2e1',
        'on-surface-variant':       '#bfcaba',
        'on-background':            '#e5e2e1',
        // Inverse
        'inverse-surface':          '#e5e2e1',
        'inverse-on-surface':       '#313030',
        // Primary (Forest Green)
        'primary':                  '#88d982',
        'on-primary':               '#003909',
        'primary-container':        '#2e7d32',
        'on-primary-container':     '#cbffc2',
        'inverse-primary':          '#1b6d24',
        'primary-fixed':            '#a3f69c',
        'primary-fixed-dim':        '#88d982',
        'on-primary-fixed':         '#002204',
        'on-primary-fixed-variant': '#005312',
        // Secondary
        'secondary':                '#7ddc7a',
        'on-secondary':             '#00390a',
        'secondary-container':      '#03711e',
        'on-secondary-container':   '#92f28e',
        'secondary-fixed':          '#98f994',
        'secondary-fixed-dim':      '#7ddc7a',
        'on-secondary-fixed':       '#002204',
        'on-secondary-fixed-variant':'#005313',
        // Tertiary (pink/rose accent)
        'tertiary':                 '#ffb1c7',
        'on-tertiary':              '#610931',
        'tertiary-container':       '#b14b6f',
        'on-tertiary-container':    '#ffedf0',
        'tertiary-fixed':           '#ffd9e2',
        'tertiary-fixed-dim':       '#ffb1c7',
        'on-tertiary-fixed':        '#3f001c',
        'on-tertiary-fixed-variant':'#7f2448',
        // Error
        'error':                    '#ffb4ab',
        'on-error':                 '#690005',
        'error-container':          '#93000a',
        'on-error-container':       '#ffdad6',
        // Structural
        'outline':                  '#8a9485',
        'outline-variant':          '#40493d',
        'border-stone':             '#333333',
        // Custom brand
        'experience-orb':           '#7cfc00',
        'text-obsidian':            '#888888',
        // Alias
        'background':               '#131313',
      },
      fontFamily: {
        'headline': ['"Space Grotesk"', 'sans-serif'],
        'body':     ['Inter', 'sans-serif'],
        'mono':     ['"JetBrains Mono"', 'monospace'],
        // Stitch-style aliases
        'headline-xl':          ['"Space Grotesk"', 'sans-serif'],
        'headline-lg':          ['"Space Grotesk"', 'sans-serif'],
        'headline-lg-mobile':   ['"Space Grotesk"', 'sans-serif'],
        'body-md':              ['Inter', 'sans-serif'],
        'body-sm':              ['Inter', 'sans-serif'],
        'label-mono':           ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'headline-xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-md':     ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm':     ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-mono':  ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
      },
      spacing: {
        'unit':            '4px',
        'gutter':          '16px',
        'margin-mobile':   '16px',
        'margin-desktop':  '32px',
        'container-max':   '1200px',
      },
      maxWidth: {
        'container-max': '1200px',
      },
      // Sharp corners only
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
