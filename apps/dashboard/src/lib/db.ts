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
  // Ask Turso for compressed responses. Movement and event logs are plain text that shrinks about
  // 6x; without this header a 3 MB log came over the wire uncompressed. Only the header changes:
  // no timeouts or retries here (those live in execute below).
  const fetchCompressed = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('accept-encoding')) headers.set('accept-encoding', 'gzip, br');
    return fetch(input, { ...init, headers });
  };
  const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN, fetch: fetchCompressed });
  const execute = client.execute.bind(client) as (...args: unknown[]) => ReturnType<typeof client.execute>;
  // The Workers runtime sometimes reuses a pooled connection the database already closed and fails
  // with "Network connection lost", which used to surface as a 500 page. Statements that are safe to
  // repeat (reads, and DELETE, which removes the same rows twice or none) are retried once on that
  // error. Logout needs this: a lost DELETE left the session token valid after the user logged out.
  // Inserts and updates are not retried, so nothing can be applied twice.
  client.execute = (async (...args: unknown[]) => {
    try {
      return await execute(...args);
    } catch (err) {
      if (!isSafeToRepeat(args[0]) || !isDroppedConnection(err)) throw err;
      return execute(...args);
    }
  }) as typeof client.execute;
  return client;
}

const REPEATABLE_SQL = /^\s*(select|with|pragma|delete)\b/i;

function isSafeToRepeat(stmt: unknown): boolean {
  const sql = typeof stmt === 'string' ? stmt : (stmt as { sql?: unknown } | null)?.sql;
  return typeof sql === 'string' && REPEATABLE_SQL.test(sql);
}

function isDroppedConnection(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.message} ${String((err as { cause?: unknown }).cause ?? '')}` : String(err);
  return /network connection lost|internal error|fetch failed|ECONNRESET/i.test(msg);
}
