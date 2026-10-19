// Overview aggregates (KPIs and every chart) are computed from all sessions, which is the slowest
// query set in the dashboard. When several instructors open the overview at once they now share
// one computation (single flight), and the result is reused for a short window. Any write that
// changes sessions calls invalidateOverview() so an instructor's own edit shows up immediately.
const TTL_MS = 30_000;

let cached: { value: unknown; at: number } | null = null;
let pending: Promise<unknown> | null = null;

export async function cachedOverview<T>(compute: () => Promise<T>): Promise<T> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value as T;
  if (pending) return pending as Promise<T>;
  pending = compute()
    .then((value) => { cached = { value, at: Date.now() }; return value; })
    .finally(() => { pending = null; });
  return pending as Promise<T>;
}

export function invalidateOverview(): void {
  cached = null;
}
