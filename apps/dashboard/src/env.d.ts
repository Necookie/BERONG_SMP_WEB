/// <reference types="astro/client" />

type CloudflareEnv = {
  TURSO_URL: string;
  TURSO_TOKEN: string;
  MIDRR_API_URL?: string;
  ASSETS: Fetcher;
};

type Runtime = import('@astrojs/cloudflare').Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends Runtime {
    user?: import('./lib/queries').User;
  }
}

// Astro v6 / @astrojs/cloudflare v13: env accessed via cloudflare:workers module
declare module 'cloudflare:workers' {
  const env: CloudflareEnv;
  export { env };
}
