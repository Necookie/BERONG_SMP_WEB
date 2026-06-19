/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface':           '#131313',
        'surface-elevated':  '#1a1a1a',
        'surface-container': '#201f1f',
        'surface-deep':      '#0d0d0d',
        'console-base':      '#090909',
        'rule':              '#2a2a2a',
        'border-stone':      '#333333',
        'on-surface':        '#e5e2e1',
        'on-surface-variant':'#bfcaba',
        'muted-label':       '#555555',
        'text-obsidian':     '#888888',
        // Brand green — serves double duty as HIGH tier
        'primary':           '#88d982',
        'primary-container': '#2e7d32',
        // Preparedness tiers
        'tier-high':         '#88d982',
        'tier-moderate':     '#c9a84c',
        'tier-low':          '#c45c5c',
      },
      fontFamily: {
        'display': ['"Space Grotesk"', 'sans-serif'],
        'body':    ['Inter', 'sans-serif'],
        'mono':    ['"JetBrains Mono"', 'monospace'],
      },
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
