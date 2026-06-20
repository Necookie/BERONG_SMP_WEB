import { createClient } from '@libsql/client/web';

type Env = { TURSO_URL: string; TURSO_TOKEN: string };

/**
 * Returns Turso credentials from whichever source is available:
 *   1. Cloudflare Workers runtime (production / wrangler dev)
 *   2. Vite import.meta.env (astro dev with .env.local)
 */
export function getEnv(locals: unknown): Env | undefined {
  try {
    const env = (locals as App.Locals).runtime?.env;
    if (env?.TURSO_URL && env?.TURSO_TOKEN) return env;
  } catch {}
  const url   = import.meta.env.TURSO_URL   as string | undefined;
  const token = import.meta.env.TURSO_TOKEN as string | undefined;
  if (url && token) return { TURSO_URL: url, TURSO_TOKEN: token };
  return undefined;
}

export function getDb(env: Env) {
  return createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
}
