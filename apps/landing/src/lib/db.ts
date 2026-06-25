import { createClient } from '@libsql/client/web';

type Env = { TURSO_URL: string; TURSO_TOKEN: string };

export async function getEnv(): Promise<Env | undefined> {
  try {
    const { env: cfEnv } = await import('cloudflare:workers');
    const url   = (cfEnv as Record<string, string>)?.TURSO_URL;
    const token = (cfEnv as Record<string, string>)?.TURSO_TOKEN;
    if (url && token) return { TURSO_URL: url, TURSO_TOKEN: token };
  } catch {}
  
  const url   = import.meta.env.TURSO_URL   as string | undefined;
  const token = import.meta.env.TURSO_TOKEN as string | undefined;
  if (url && token) return { TURSO_URL: url, TURSO_TOKEN: token };
  return undefined;
}

export function getDb(env: Env) {
  return createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
}
