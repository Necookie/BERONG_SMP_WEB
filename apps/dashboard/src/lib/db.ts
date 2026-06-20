import { createClient } from '@libsql/client/web';

export function getDb(env: { TURSO_URL: string; TURSO_TOKEN: string }) {
  return createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
}
