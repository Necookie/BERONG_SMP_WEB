import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// Two deploy targets share this app:
//   - Cloudflare Worker (default): `pnpm deploy:landing`
//   - GitHub Pages: built by .github/workflows/pages.yml with DEPLOY_TARGET=github-pages.
//     Pages is static-only and serves from /BERONG_SMP_WEB/, so that build drops the
//     Cloudflare adapter and sets a base path. The workflow also removes src/pages/api
//     (those routes need a server) and points the browser at the Cloudflare copy of
//     them through PUBLIC_API_ORIGIN.
const isGitHubPages = process.env.DEPLOY_TARGET === 'github-pages';

const target = isGitHubPages
  ? {
      site: 'https://necookie.github.io',
      base: '/BERONG_SMP_WEB',
    }
  : {
      site: 'https://berongsmp.dev',
      adapter: cloudflare({
        imageService: 'compile'
      }),
    };

// https://astro.build/config
export default defineConfig({
  ...target,
  output: 'static',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false, configFile: './tailwind.config.cjs' }),
    sitemap(),
  ],
});
