/// <reference types="astro/client" />

type CloudflareEnv = {
  TURSO_URL: string;
  TURSO_TOKEN: string;
  ASSETS: Fetcher;
};

type Runtime = import('@astrojs/cloudflare').Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends Runtime {}
}
