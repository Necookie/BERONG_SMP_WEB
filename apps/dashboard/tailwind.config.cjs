/** @type {import('tailwindcss').Config} */
const base = require('../../tailwind.base.cjs');

module.exports = {
  ...base,
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      ...base.theme.extend,
      // Dashboard-specific aliases (kept for backward compat with existing class names)
      colors: {
        ...base.theme.extend.colors,
      },
    },
  },
};
