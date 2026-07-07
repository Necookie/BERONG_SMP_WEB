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
  simulation_type: 'FIRE' | 'EARTHQUAKE' | 'CCS_FIRE' | 'CCS_EARTHQUAKE' | null;
  simulation_score: number;
  passed: number;
  event_log: string | null;
  move_log_csv: string | null;
  prep_level: 'HIGH' | 'MODERATE' | 'LOW' | null;
  confidence: number | null;
  bfp_notes: string | null;
  // Populated by the MiDRR ML API (synthetic demo model) — kept separate from
  // prep_level/confidence above, which are hand-authored/seeded values.
  midrr_prep_level: 'HIGH' | 'MODERATE' | 'LOW' | null;
  midrr_prep_score: number | null;
  midrr_result_text: string | null;
  midrr_feature_importance: string | null; // JSON: { feature, weight }[]
  midrr_features: string | null; // JSON: Record<feature, value> — the 9 engineered features
  midrr_predicted_at: string | null;
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
      SUM(CASE WHEN simulation_type IN ('FIRE','CCS_FIRE')               THEN 1 ELSE 0 END) AS fire_count,
      SUM(CASE WHEN simulation_type IN ('EARTHQUAKE','CCS_EARTHQUAKE')   THEN 1 ELSE 0 END) AS quake_count,
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

export async function getAllSessions(env: Env, limit?: number, offset?: number): Promise<LiveSession[]> {
  const db = getDb(env);
  if (limit !== undefined) {
    const off = offset ?? 0;
    const res = await db.execute({
      sql: `SELECT * FROM sessions ORDER BY start_time DESC LIMIT ? OFFSET ?`,
      args: [limit, off]
    });
    return res.rows as unknown as LiveSession[];
  }
  const res = await db.execute(`SELECT * FROM sessions ORDER BY start_time DESC`);
  return res.rows as unknown as LiveSession[];
}

export async function getSessionCount(env: Env): Promise<number> {
  const db = getDb(env);
  const res = await db.execute(`SELECT COUNT(*) AS total FROM sessions`);
  return Number((res.rows[0] as Record<string, unknown>).total ?? 0);
}

// Mirrors derivePrepLevel(): a stored prep_level always wins, otherwise fall back
// to the same score thresholds used client-side (data-sort-level, tier-badge class).
const LEVEL_EXPR = `COALESCE(prep_level, CASE WHEN simulation_score >= 75 THEN 'HIGH' WHEN simulation_score >= 40 THEN 'MODERATE' ELSE 'LOW' END)`;
const LEVEL_RANK_EXPR = `CASE ${LEVEL_EXPR} WHEN 'HIGH' THEN 3 WHEN 'MODERATE' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END`;
const DURATION_MS_EXPR = `CASE WHEN end_time IS NOT NULL THEN (julianday(end_time) - julianday(start_time)) * 86400000 ELSE 0 END`;

const SESSION_SORT_COLUMNS: Record<string, string> = {
  id: 'id',
  student: 'student_name COLLATE NOCASE',
  section: `COALESCE(section, '') COLLATE NOCASE`,
  scenario: `COALESCE(simulation_type, 'UNKNOWN') COLLATE NOCASE`,
  date: 'start_time',
  duration: DURATION_MS_EXPR,
  score: 'simulation_score',
  level: LEVEL_RANK_EXPR,
};

export interface SessionListFilters {
  q?: string;
  type?: string;   // 'FIRE' | 'EARTHQUAKE' | 'ALL' | undefined
  level?: string;  // 'HIGH' | 'MODERATE' | 'LOW' | 'ALL' | undefined
  sort?: string;
  dir?: 'asc' | 'desc';
}

function buildSessionsWhere(filters: SessionListFilters): { where: string; args: (string | number)[] } {
  const clauses: string[] = [];
  const args: (string | number)[] = [];
  if (filters.type && filters.type !== 'ALL') {
    clauses.push('simulation_type = ?');
    args.push(filters.type);
  }
  if (filters.level && filters.level !== 'ALL') {
    clauses.push(`${LEVEL_EXPR} = ?`);
    args.push(filters.level);
  }
  if (filters.q && filters.q.trim()) {
    clauses.push('(student_name LIKE ? OR student_id LIKE ? OR section LIKE ?)');
    const like = `%${filters.q.trim()}%`;
    args.push(like, like, like);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args };
}

export async function getSessionsPage(
  env: Env,
  filters: SessionListFilters,
  limit: number,
  offset: number
): Promise<{ rows: LiveSession[]; total: number }> {
  const db = getDb(env);
  const { where, args } = buildSessionsWhere(filters);
  const sortCol = SESSION_SORT_COLUMNS[filters.sort ?? 'date'] ?? SESSION_SORT_COLUMNS.date;
  const dir = filters.dir === 'asc' ? 'ASC' : 'DESC';

  const [listRes, countRes] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM sessions ${where} ORDER BY ${sortCol} ${dir} LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    }),
    db.execute({ sql: `SELECT COUNT(*) AS total FROM sessions ${where}`, args }),
  ]);

  return {
    rows: listRes.rows as unknown as LiveSession[],
    total: Number((countRes.rows[0] as Record<string, unknown>).total ?? 0),
  };
}

export async function getSessionById(env: Env, id: number): Promise<LiveSession | null> {
  const db = getDb(env);
  const res = await db.execute(`SELECT * FROM sessions WHERE id = ?`, [id]);
  return (res.rows[0] as unknown as LiveSession) ?? null;
}

// Mirrors derivePrepLevel(Number(s.best_score), s.best_prep_level) applied to a
// roster row: stored best_prep_level (itself MAX(prep_level) across a student's
// sessions) wins, otherwise fall back to best_score thresholds.
const ROSTER_LEVEL_RANK_EXPR = `CASE COALESCE(best_prep_level, CASE WHEN best_score >= 75 THEN 'HIGH' WHEN best_score >= 40 THEN 'MODERATE' ELSE 'LOW' END) WHEN 'HIGH' THEN 3 WHEN 'MODERATE' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END`;

const ROSTER_SORT_COLUMNS: Record<string, string> = {
  student: 'student_name COLLATE NOCASE',
  id: `COALESCE(student_id, '') COLLATE NOCASE`,
  section: `COALESCE(section, '') COLLATE NOCASE`,
  sessions: 'session_count',
  'avg-score': 'avg_score',
  'best-score': 'best_score',
  passed: 'CAST(pass_count AS REAL) / session_count',
  level: ROSTER_LEVEL_RANK_EXPR,
  'last-active': 'latest_start',
};

export interface RosterFilters {
  q?: string;
  section?: string; // section code or 'ALL'
  sort?: string;
  dir?: 'asc' | 'desc';
}

function buildRosterWhere(filters: RosterFilters): { where: string; args: (string | number)[] } {
  const clauses: string[] = [`status='completed'`];
  const args: (string | number)[] = [];
  if (filters.section && filters.section !== 'ALL') {
    clauses.push('section = ?');
    args.push(filters.section);
  }
  if (filters.q && filters.q.trim()) {
    clauses.push('(student_name LIKE ? OR student_id LIKE ? OR section LIKE ?)');
    const like = `%${filters.q.trim()}%`;
    args.push(like, like, like);
  }
  return { where: `WHERE ${clauses.join(' AND ')}`, args };
}

export async function getRosterStats(
  env: Env,
  filters: RosterFilters = {},
  limit?: number,
  offset?: number
): Promise<RosterRow[]> {
  const db = getDb(env);
  const { where, args } = buildRosterWhere(filters);
  const sortCol = ROSTER_SORT_COLUMNS[filters.sort ?? 'avg-score'] ?? ROSTER_SORT_COLUMNS['avg-score'];
  const dir = filters.dir === 'asc' ? 'ASC' : 'DESC';
  const limitClause = limit !== undefined ? 'LIMIT ? OFFSET ?' : '';
  const limitArgs = limit !== undefined ? [limit, offset ?? 0] : [];

  const res = await db.execute({
    sql: `
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
      ${where}
      GROUP BY student_name, student_id, section
      ORDER BY ${sortCol} ${dir}
      ${limitClause}
    `,
    args: [...args, ...limitArgs],
  });
  return res.rows as unknown as RosterRow[];
}

export async function getRosterCount(env: Env, filters: RosterFilters = {}): Promise<number> {
  const db = getDb(env);
  const { where, args } = buildRosterWhere(filters);
  const res = await db.execute({
    sql: `
      SELECT COUNT(*) AS total FROM (
        SELECT 1 FROM sessions ${where} GROUP BY student_name, student_id, section
      )
    `,
    args,
  });
  return Number((res.rows[0] as Record<string, unknown>).total ?? 0);
}

export interface RosterCohortSummary {
  totalStudents: number;
  totalSessions: number;
  cohortAvg: number;
  highCount: number;
  modCount: number;
  lowCount: number;
}

// Cohort-wide KPI/distribution numbers, computed with one aggregate query instead
// of fetching every roster row into JS. Deliberately unfiltered by section/search —
// "cohort distribution" reflects the whole roster regardless of what's currently
// being searched/paginated.
export async function getRosterCohortSummary(env: Env): Promise<RosterCohortSummary> {
  const db = getDb(env);
  const res = await db.execute(`
    WITH roster AS (
      SELECT
        COUNT(*)                                       AS session_count,
        CAST(ROUND(AVG(simulation_score)) AS INTEGER)  AS avg_score,
        MAX(prep_level)                                AS best_prep_level,
        MAX(simulation_score)                          AS best_score
      FROM sessions
      WHERE status='completed'
      GROUP BY student_name, student_id, section
    ), leveled AS (
      SELECT
        session_count,
        avg_score,
        COALESCE(best_prep_level, CASE WHEN best_score >= 75 THEN 'HIGH' WHEN best_score >= 40 THEN 'MODERATE' ELSE 'LOW' END) AS level
      FROM roster
    )
    SELECT
      COUNT(*)                                              AS total_students,
      COALESCE(SUM(session_count), 0)                       AS total_sessions,
      COALESCE(AVG(avg_score), 0)                           AS cohort_avg,
      SUM(CASE WHEN level = 'HIGH'     THEN 1 ELSE 0 END)   AS high_count,
      SUM(CASE WHEN level = 'MODERATE' THEN 1 ELSE 0 END)   AS mod_count,
      SUM(CASE WHEN level = 'LOW'      THEN 1 ELSE 0 END)   AS low_count
    FROM leveled
  `);
  const r = (res.rows[0] ?? {}) as Record<string, unknown>;
  return {
    totalStudents: Number(r.total_students ?? 0),
    totalSessions: Number(r.total_sessions ?? 0),
    cohortAvg: Math.round(Number(r.cohort_avg ?? 0)),
    highCount: Number(r.high_count ?? 0),
    modCount: Number(r.mod_count ?? 0),
    lowCount: Number(r.low_count ?? 0),
  };
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

const VERBOSE_EVENT_TYPES = new Set(['FIRE_SPREAD']);

export function parseEventLog(eventLogJson: string | null, includeVerbose = false) {
  if (!eventLogJson) return [];
  try {
    const events = JSON.parse(eventLogJson) as Array<{type: string; tOffsetMs: number; data: Record<string, unknown>}>;
    return events
      .filter(e => includeVerbose || !VERBOSE_EVENT_TYPES.has(e.type))
      .map(e => ({
        ts:   `+${(e.tOffsetMs / 1000).toFixed(1)}s`.padStart(8),
        code: e.type.padEnd(16),
        msg:  Object.entries(e.data).map(([k, v]) => `${k}=${v}`).join(' '),
      }));
  } catch {
    return [];
  }
}

export interface RubricSignals {
  alarmActivated:    boolean;
  assemblyReached:   boolean;
  exitUsed:          string | null;   // exit label or null
  evacuationTimeSec: number | null;   // seconds from trigger to assembly_area_reached
  extHits:           number;          // EXT_SPRAY events with hit_fire=true
  doorOpens:         number;
}

export function extractRubricSignals(eventLogJson: string | null): RubricSignals {
  const out: RubricSignals = {
    alarmActivated: false, assemblyReached: false,
    exitUsed: null, evacuationTimeSec: null,
    extHits: 0, doorOpens: 0,
  };
  if (!eventLogJson) return out;
  try {
    const events = JSON.parse(eventLogJson) as Array<{type: string; tOffsetMs: number; data: Record<string, unknown>}>;
    for (const e of events) {
      if (e.type === 'fire_alarm_activate') out.alarmActivated = true;
      if (e.type === 'assembly_area_reached') {
        out.assemblyReached = true;
        const t = e.data.t;
        if (typeof t === 'number') out.evacuationTimeSec = t;
      }
      if (e.type === 'emergency_exit' && !out.exitUsed) {
        out.exitUsed = String(e.data.exit ?? e.data.interaction_target ?? '');
      }
      if ((e.type === 'EXT_SPRAY' && e.data.hit_fire === true) ||
          (e.type === 'extinguisher_use' && e.data.hit_target === true)) out.extHits++;
      if (e.type === 'door_open') out.doorOpens++;
    }
  } catch {}
  return out;
}

export async function updateSessionDetails(
  env: Env,
  id: number,
  details: {
    student_name: string;
    student_id: string | null;
    section: string | null;
    simulation_type: 'FIRE' | 'EARTHQUAKE' | 'CCS_FIRE' | 'CCS_EARTHQUAKE' | null;
    simulation_score: number;
    prep_level: 'HIGH' | 'MODERATE' | 'LOW' | 'PENDING' | null;
    passed: number;
  }
): Promise<void> {
  const db = getDb(env);
  await db.execute(
    `UPDATE sessions 
     SET student_name = ?, student_id = ?, section = ?, simulation_type = ?, 
         simulation_score = ?, prep_level = ?, passed = ?
     WHERE id = ?`,
    [
      details.student_name,
      details.student_id ? details.student_id : null,
      details.section ? details.section : null,
      details.simulation_type,
      details.simulation_score,
      details.prep_level === 'PENDING' ? null : details.prep_level,
      details.passed,
      id
    ]
  );
}

export async function deleteSession(env: Env, id: number): Promise<void> {
  const db = getDb(env);
  await db.execute(`DELETE FROM sessions WHERE id = ?`, [id]);
}

export async function updateSessionPrediction(
  env: Env,
  id: number,
  prediction: {
    prepLevel: 'HIGH' | 'MODERATE' | 'LOW';
    prepScore: number;
    featureImportance: { feature: string; weight: number }[];
    resultText: string;
    features: Record<string, number>;
  }
): Promise<void> {
  const db = getDb(env);
  await db.execute(
    `UPDATE sessions
     SET midrr_prep_level = ?, midrr_prep_score = ?, midrr_result_text = ?,
         midrr_feature_importance = ?, midrr_features = ?, midrr_predicted_at = datetime('now')
     WHERE id = ?`,
    [
      prediction.prepLevel,
      prediction.prepScore,
      prediction.resultText,
      JSON.stringify(prediction.featureImportance),
      JSON.stringify(prediction.features),
      id,
    ]
  );
}

export interface AuditLogEntry {
  id: number;
  session_id: number;
  action: 'edit' | 'delete';
  changed_by: string;
  changed_at: string;
  old_values: string | null;
  new_values: string | null;
}

export async function logAuditEvent(
  env: Env,
  action: 'edit' | 'delete',
  sessionId: number,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  changedBy = 'admin'
): Promise<void> {
  const db = getDb(env);
  const oldStr = oldValues ? JSON.stringify(oldValues) : null;
  const newStr = newValues ? JSON.stringify(newValues) : null;
  await db.execute({
    sql: `
      INSERT INTO audit_logs (session_id, action, changed_by, old_values, new_values)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [sessionId, action, changedBy, oldStr, newStr]
  });
}

export async function getAuditLog(env: Env, sessionId: number): Promise<AuditLogEntry[]> {
  const db = getDb(env);
  const res = await db.execute({
    sql: `SELECT * FROM audit_logs WHERE session_id = ? ORDER BY changed_at DESC`,
    args: [sessionId]
  });
  return res.rows as unknown as AuditLogEntry[];
}

const SCENARIO_ORDER = ['FIRE', 'EARTHQUAKE', 'CCS_FIRE', 'CCS_EARTHQUAKE'] as const;

export interface ScoreTrendPoint {
  date: string;
  avgScore: number;
  count: number;
}

// One point per calendar day a session started on, sorted chronologically.
export async function getScoreTrend(env: Env): Promise<ScoreTrendPoint[]> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT date(start_time) AS day, CAST(ROUND(AVG(simulation_score)) AS INTEGER) AS avg_score, COUNT(*) AS cnt
    FROM sessions WHERE status='completed'
    GROUP BY day
    ORDER BY day ASC
  `);
  return res.rows.map(r => {
    const row = r as Record<string, unknown>;
    return {
      date: row.day != null ? String(row.day) : 'unknown',
      avgScore: Number(row.avg_score ?? 0),
      count: Number(row.cnt ?? 0),
    };
  });
}

export interface ScenarioStat {
  type: string;
  count: number;
  avgScore: number;
  passRate: number;
}

// Average score + pass rate per simulation type, in a fixed display order.
export async function getScenarioBreakdown(env: Env): Promise<ScenarioStat[]> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT COALESCE(simulation_type, 'UNKNOWN') AS type, COUNT(*) AS cnt,
           CAST(ROUND(AVG(simulation_score)) AS INTEGER) AS avg_score, SUM(passed) AS passed_cnt
    FROM sessions WHERE status='completed'
    GROUP BY type
  `);
  const byType = new Map<string, ScenarioStat>();
  for (const r of res.rows) {
    const row = r as Record<string, unknown>;
    const type = String(row.type);
    const cnt = Number(row.cnt ?? 0);
    byType.set(type, {
      type,
      count: cnt,
      avgScore: Number(row.avg_score ?? 0),
      passRate: cnt ? Math.round((Number(row.passed_cnt ?? 0) / cnt) * 100) : 0,
    });
  }
  return SCENARIO_ORDER.filter(t => byType.has(t)).map(t => byType.get(t)!);
}

export interface PrepByScenario {
  type: string;
  high: number;
  moderate: number;
  low: number;
}

// HIGH/MODERATE/LOW counts per simulation type, for a stacked bar chart.
export async function getPrepByScenario(env: Env): Promise<PrepByScenario[]> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT COALESCE(simulation_type, 'UNKNOWN') AS type, ${LEVEL_EXPR} AS level, COUNT(*) AS cnt
    FROM sessions WHERE status='completed'
    GROUP BY type, level
  `);
  const byType = new Map<string, PrepByScenario>();
  for (const r of res.rows) {
    const row = r as Record<string, unknown>;
    const type = String(row.type);
    const entry = byType.get(type) ?? { type, high: 0, moderate: 0, low: 0 };
    const cnt = Number(row.cnt ?? 0);
    const level = String(row.level);
    if (level === 'HIGH') entry.high += cnt;
    else if (level === 'MODERATE') entry.moderate += cnt;
    else entry.low += cnt;
    byType.set(type, entry);
  }
  return SCENARIO_ORDER.filter(t => byType.has(t)).map(t => byType.get(t)!);
}

export interface SectionStat {
  section: string;
  avgScore: number;
  count: number;
  passRate: number;
}

// Average score per section, sorted best-first.
export async function getSectionPerformance(env: Env): Promise<SectionStat[]> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT COALESCE(section, 'Unassigned') AS section, COUNT(*) AS cnt,
           CAST(ROUND(AVG(simulation_score)) AS INTEGER) AS avg_score, SUM(passed) AS passed_cnt
    FROM sessions WHERE status='completed'
    GROUP BY section
    ORDER BY avg_score DESC
  `);
  return res.rows.map(r => {
    const row = r as Record<string, unknown>;
    const cnt = Number(row.cnt ?? 0);
    return {
      section: String(row.section),
      avgScore: Number(row.avg_score ?? 0),
      count: cnt,
      passRate: cnt ? Math.round((Number(row.passed_cnt ?? 0) / cnt) * 100) : 0,
    };
  });
}

// Score histogram bucketed directly in SQL (10 buckets: 0-10, 11-20, ..., 91-100)
// instead of transferring every completed session's raw score to bucket in JS.
export async function getScoreHistogramBuckets(env: Env): Promise<number[]> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT MIN(9, CAST(simulation_score / 10 AS INTEGER)) AS bucket, COUNT(*) AS cnt
    FROM sessions WHERE status='completed'
    GROUP BY bucket
  `);
  const buckets = Array(10).fill(0);
  for (const r of res.rows) {
    const row = r as Record<string, unknown>;
    const idx = Number(row.bucket);
    if (idx >= 0 && idx < 10) buckets[idx] = Number(row.cnt ?? 0);
  }
  return buckets;
}

export interface AnalyticsSession {
  event_log: string | null;
}

// Only event_log survives here — every other analytics chart is now a direct SQL
// aggregate (see getScoreTrend/getScenarioBreakdown/getPrepByScenario/getSectionPerformance
// above). Safety-behavior and evacuation-time charts still need per-row event_log
// parsing (extractRubricSignals), which isn't practical to replicate as SQL JSON path
// expressions without real risk of behavior drift.
export async function getAnalyticsSessions(env: Env): Promise<AnalyticsSession[]> {
  const db = getDb(env);
  const res = await db.execute(`SELECT event_log FROM sessions WHERE status = 'completed'`);
  return res.rows.map(r => {
    const row = r as Record<string, unknown>;
    return { event_log: row.event_log != null ? String(row.event_log) : null };
  });
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  role: string;
  status: string;
}

export interface AdminSession {
  id: number;
  user_id: number;
  token: string;
  created_at: string;
  expires_at: string;
}

export async function getUserByUsername(env: Env, username: string): Promise<User | undefined> {
  const db = getDb(env);
  const res = await db.execute({
    sql: `SELECT * FROM users WHERE username = ? LIMIT 1`,
    args: [username]
  });
  if (res.rows.length === 0) return undefined;
  const r = res.rows[0] as Record<string, unknown>;
  return {
    id: Number(r.id),
    username: String(r.username),
    password_hash: String(r.password_hash),
    created_at: String(r.created_at),
    role: String(r.role ?? 'admin'),
    status: String(r.status ?? 'pending'),
  };
}

export async function createUser(env: Env, username: string, passwordHash: string, role = 'admin', status = 'pending'): Promise<void> {
  const db = getDb(env);
  await db.execute({
    sql: `INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)`,
    args: [username, passwordHash, role, status]
  });
}

export async function getUserById(env: Env, id: number): Promise<User | undefined> {
  const db = getDb(env);
  const res = await db.execute({
    sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
    args: [id]
  });
  if (res.rows.length === 0) return undefined;
  const r = res.rows[0] as Record<string, unknown>;
  return {
    id: Number(r.id),
    username: String(r.username),
    password_hash: String(r.password_hash),
    created_at: String(r.created_at),
    role: String(r.role ?? 'admin'),
    status: String(r.status ?? 'pending'),
  };
}

// Self-service username change — callers must scope `id` to the requesting user's
// own session, never a value taken from request params/body.
export async function updateUsername(env: Env, id: number, username: string): Promise<void> {
  const db = getDb(env);
  await db.execute({
    sql: `UPDATE users SET username = ? WHERE id = ?`,
    args: [username, id]
  });
}

// Self-service password change — same scoping rule as updateUsername.
export async function updatePasswordHash(env: Env, id: number, passwordHash: string): Promise<void> {
  const db = getDb(env);
  await db.execute({
    sql: `UPDATE users SET password_hash = ? WHERE id = ?`,
    args: [passwordHash, id]
  });
}

export async function hasAnyUsers(env: Env): Promise<boolean> {
  const db = getDb(env);
  const res = await db.execute(`SELECT COUNT(*) as count FROM users`);
  if (res.rows.length === 0) return false;
  const r = res.rows[0] as Record<string, unknown>;
  return Number(r.count ?? 0) > 0;
}

export async function createSession(env: Env, userId: number, token: string, expiresAt: string): Promise<void> {
  const db = getDb(env);
  await db.execute({
    sql: `INSERT INTO admin_sessions (user_id, token, expires_at) VALUES (?, ?, ?)`,
    args: [userId, token, expiresAt]
  });
}

export async function validateSession(env: Env, token: string): Promise<{ session: AdminSession; user: User } | null> {
  const db = getDb(env);
  const res = await db.execute({
    sql: `
      SELECT s.*, u.username, u.password_hash, u.created_at as u_created_at, u.role, u.status
      FROM admin_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
        AND (u.status = 'active' OR u.role = 'owner')
      LIMIT 1
    `,
    args: [token]
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  const session: AdminSession = {
    id: Number(row.id),
    user_id: Number(row.user_id),
    token: String(row.token),
    created_at: String(row.created_at),
    expires_at: String(row.expires_at),
  };
  const user: User = {
    id: Number(row.user_id),
    username: String(row.username),
    password_hash: String(row.password_hash),
    created_at: String(row.u_created_at),
    role: String(row.role ?? 'admin'),
    status: String(row.status ?? 'pending'),
  };
  return { session, user };
}

export async function deleteSessionToken(env: Env, token: string): Promise<void> {
  const db = getDb(env);
  await db.execute({
    sql: `DELETE FROM admin_sessions WHERE token = ?`,
    args: [token]
  });
}

export async function getAllUsers(env: Env): Promise<User[]> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT * FROM users WHERE role != 'owner' ORDER BY created_at DESC
  `);
  return res.rows.map(r => {
    const row = r as Record<string, unknown>;
    return {
      id: Number(row.id),
      username: String(row.username),
      password_hash: String(row.password_hash),
      created_at: String(row.created_at),
      role: String(row.role ?? 'admin'),
      status: String(row.status ?? 'pending'),
    };
  });
}

export async function updateUserStatus(env: Env, userId: number, status: 'active' | 'pending' | 'suspended'): Promise<void> {
  const db = getDb(env);
  await db.execute({
    sql: `UPDATE users SET status = ? WHERE id = ? AND role != 'owner'`,
    args: [status, userId]
  });
}

export async function deleteUser(env: Env, userId: number): Promise<void> {
  const db = getDb(env);
  // Delete user sessions first
  await db.execute({
    sql: `DELETE FROM admin_sessions WHERE user_id = ?`,
    args: [userId]
  });
  // Delete user
  await db.execute({
    sql: `DELETE FROM users WHERE id = ? AND role != 'owner'`,
    args: [userId]
  });
}

