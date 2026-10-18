import { createClient } from '@libsql/client/web';

type Env = { TURSO_URL: string; TURSO_TOKEN: string };

/**
 * In @astrojs/cloudflare v13 / Astro v6, `locals.runtime.env` is removed.
 * `cloudflare:workers` env is only populated during request context, so it
 * must be imported dynamically inside the function — a static module-level
 * import captures an empty value at init time and causes a 500.
 */
export async function getEnv(): Promise<Env | undefined> {
  try {
    const { env: cfEnv } = await import('cloudflare:workers');
    const url   = (cfEnv as Record<string, string>)?.TURSO_URL;
    const token = (cfEnv as Record<string, string>)?.TURSO_TOKEN;
    if (url && token) return { TURSO_URL: url, TURSO_TOKEN: token };
  } catch {}
  // Fallback: pnpm dev with .env.local (no platformProxy)
  const url   = import.meta.env.TURSO_URL   as string | undefined;
  const token = import.meta.env.TURSO_TOKEN as string | undefined;
  if (url && token) return { TURSO_URL: url, TURSO_TOKEN: token };
  return undefined;
}

export function getDb(env: Env) {
  return createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN, fetch: resilientFetch });
}

const DB_TIMEOUT_MS = 10_000;
const READ_ONLY_SQL = /^\s*(select|with|pragma)\b/i;

/**
 * Fetch used by the Turso client. The Workers runtime sometimes reuses a pooled connection the
 * database has already closed and fails the request with "Network connection lost", and a stuck
 * connection can otherwise hang a page indefinitely. Every request gets a timeout; requests made
 * only of read statements are retried once, since repeating them is harmless. Writes are never
 * retried, so a write that did reach the database cannot be applied twice.
 */
async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const readOnly = isReadOnly(await request.clone().text());
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(request.clone(), { signal: AbortSignal.timeout(DB_TIMEOUT_MS) });
    } catch (err) {
      if (!readOnly || attempt >= 1) throw err;
    }
  }
}

function isReadOnly(body: string): boolean {
  try {
    const sqls: string[] = [];
    JSON.stringify(JSON.parse(body), (key, value) => {
      if (key === 'sql' && typeof value === 'string') sqls.push(value);
      return value;
    });
    return sqls.length > 0 && sqls.every((s) => READ_ONLY_SQL.test(s));
  } catch {
    return false;
  }
}
