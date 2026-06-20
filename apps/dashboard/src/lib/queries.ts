import { getDb } from './db';

export interface LiveSession {
  id: number;
  student_name: string;
  student_id: string | null;
  section: string | null;
  station_account: string;
  start_time: string;
  end_time: string | null;
  status: string;
  tutorial_completed: number;
  tutorial_duration_s: number | null;
  simulation_type: 'FIRE' | 'EARTHQUAKE' | null;
  simulation_score: number;
  passed: number;
  event_log: string | null;
  prep_level: 'HIGH' | 'MODERATE' | 'LOW' | null;
  confidence: number | null;
  bfp_notes: string | null;
}

export interface RosterRow {
  student_name: string;
  student_id: string | null;
  section: string | null;
  session_count: number;
  best_score: number;
  avg_score: number;
  pass_count: number;
  best_prep_level: string | null;
  latest_start: string | null;
  latest_session_id: number | null;
}

export interface OverviewStats {
  total: number;
  avg_score: number;
  fire_count: number;
  quake_count: number;
  this_week: number;
  high_count: number;
  mod_count: number;
  low_count: number;
}

type Env = { TURSO_URL: string; TURSO_TOKEN: string };

export async function getOverviewStats(env: Env): Promise<OverviewStats> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT
      COUNT(*)                                                          AS total,
      COALESCE(AVG(simulation_score), 0)                               AS avg_score,
      SUM(CASE WHEN simulation_type='FIRE'       THEN 1 ELSE 0 END)   AS fire_count,
      SUM(CASE WHEN simulation_type='EARTHQUAKE' THEN 1 ELSE 0 END)   AS quake_count,
      SUM(CASE WHEN date(start_time) >= date('now','-7 days') THEN 1 ELSE 0 END) AS this_week,
      SUM(CASE WHEN prep_level='HIGH'     THEN 1 ELSE 0 END)          AS high_count,
      SUM(CASE WHEN prep_level='MODERATE' THEN 1 ELSE 0 END)          AS mod_count,
      SUM(CASE WHEN prep_level='LOW'      THEN 1 ELSE 0 END)          AS low_count
    FROM sessions WHERE status='completed'
  `);
  const r = res.rows[0] as Record<string, unknown>;
  return {
    total:      Number(r.total      ?? 0),
    avg_score:  Math.round(Number(r.avg_score ?? 0)),
    fire_count: Number(r.fire_count ?? 0),
    quake_count:Number(r.quake_count?? 0),
    this_week:  Number(r.this_week  ?? 0),
    high_count: Number(r.high_count ?? 0),
    mod_count:  Number(r.mod_count  ?? 0),
    low_count:  Number(r.low_count  ?? 0),
  };
}

export async function getRecentSessions(env: Env, limit = 5): Promise<LiveSession[]> {
  const db = getDb(env);
  const res = await db.execute(
    `SELECT * FROM sessions WHERE status='completed' ORDER BY start_time DESC LIMIT ?`,
    [limit]
  );
  return res.rows as unknown as LiveSession[];
}

export async function getAllSessions(env: Env): Promise<LiveSession[]> {
  const db = getDb(env);
  const res = await db.execute(`SELECT * FROM sessions ORDER BY start_time DESC`);
  return res.rows as unknown as LiveSession[];
}

export async function getSessionById(env: Env, id: number): Promise<LiveSession | null> {
  const db = getDb(env);
  const res = await db.execute(`SELECT * FROM sessions WHERE id = ?`, [id]);
  return (res.rows[0] as unknown as LiveSession) ?? null;
}

export async function getRosterStats(env: Env): Promise<RosterRow[]> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT
      student_name,
      student_id,
      section,
      COUNT(*)                              AS session_count,
      MAX(simulation_score)                 AS best_score,
      CAST(ROUND(AVG(simulation_score)) AS INTEGER) AS avg_score,
      SUM(passed)                           AS pass_count,
      MAX(prep_level)                       AS best_prep_level,
      MAX(start_time)                       AS latest_start,
      MAX(id)                               AS latest_session_id
    FROM sessions
    WHERE status='completed'
    GROUP BY student_name, student_id, section
    ORDER BY avg_score DESC
  `);
  return res.rows as unknown as RosterRow[];
}

export async function getDistinctSections(env: Env): Promise<string[]> {
  const db = getDb(env);
  const res = await db.execute(
    `SELECT DISTINCT section FROM sessions WHERE section IS NOT NULL ORDER BY section`
  );
  return res.rows.map(r => String((r as Record<string, unknown>).section));
}

// ---- Helpers ----

export function formatDuration(startTime: string, endTime: string | null): string {
  if (!endTime) return '—';
  const secs = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export function derivePrepLevel(score: number, storedLevel: string | null): 'HIGH' | 'MODERATE' | 'LOW' | 'PENDING' {
  if (storedLevel) return storedLevel as 'HIGH' | 'MODERATE' | 'LOW';
  if (score >= 75) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

export function parseEventLog(eventLogJson: string | null) {
  if (!eventLogJson) return [];
  try {
    const events = JSON.parse(eventLogJson) as Array<{type: string; tOffsetMs: number; data: Record<string, unknown>}>;
    return events.map(e => ({
      ts:   `+${(e.tOffsetMs / 1000).toFixed(1)}s`.padStart(8),
      code: e.type.padEnd(16),
      msg:  Object.entries(e.data).map(([k, v]) => `${k}=${v}`).join(' '),
    }));
  } catch {
    return [];
  }
}
