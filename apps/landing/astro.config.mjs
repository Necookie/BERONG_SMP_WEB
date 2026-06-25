import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://berongsmp.dev',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile'
  }),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false, configFile: './tailwind.config.cjs' }),
    sitemap(),
  ],
});
