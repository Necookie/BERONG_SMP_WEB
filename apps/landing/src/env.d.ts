/// <reference types="astro/client" />

type CloudflareEnv = {
  TURSO_URL: string;
  TURSO_TOKEN: string;
};

// Astro v6 / @astrojs/cloudflare v13: env accessed via cloudflare:workers module
declare module 'cloudflare:workers' {
  const env: CloudflareEnv;
  export { env };
}
