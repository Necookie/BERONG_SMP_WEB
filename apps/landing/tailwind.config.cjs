/** @type {import('tailwindcss').Config} */
const base = require('../../tailwind.base.cjs');

module.exports = {
  ...base,
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      ...base.theme.extend,
      // Landing-specific colours not in the shared base
      colors: {
        ...base.theme.extend.colors,
        'tertiary':                  '#ffb1c7',
        'on-tertiary':               '#610931',
        'tertiary-container':        '#b14b6f',
        'on-tertiary-container':     '#ffedf0',
        'tertiary-fixed':            '#ffd9e2',
        'tertiary-fixed-dim':        '#ffb1c7',
        'on-tertiary-fixed':         '#3f001c',
        'on-tertiary-fixed-variant': '#7f2448',
      },
    },
  },
};
