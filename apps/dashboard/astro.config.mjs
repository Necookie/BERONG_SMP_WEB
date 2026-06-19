// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Dashboard uses SSR — needed for auth sessions, protected routes, API proxying
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),

  // Dev server on a different port from landing (4321) so both can run in parallel
  server: { port: 4322 },

  integrations: [
    react(),
    tailwind({ applyBaseStyles: false, configFile: './tailwind.config.cjs' }),
  ],
});
