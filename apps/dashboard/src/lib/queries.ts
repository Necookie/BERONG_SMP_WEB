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

export async function getSessionById(env: Env, id: number): Promise<LiveSession | null> {
  const db = getDb(env);
  const res = await db.execute(`SELECT * FROM sessions WHERE id = ?`, [id]);
  return (res.rows[0] as unknown as LiveSession) ?? null;
}

export async function getRosterStats(env: Env, limit?: number, offset?: number): Promise<RosterRow[]> {
  const db = getDb(env);
  if (limit !== undefined) {
    const off = offset ?? 0;
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
        WHERE status='completed'
        GROUP BY student_name, student_id, section
        ORDER BY avg_score DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, off]
    });
    return res.rows as unknown as RosterRow[];
  }
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

export async function getRosterCount(env: Env): Promise<number> {
  const db = getDb(env);
  const res = await db.execute(`
    SELECT COUNT(*) AS total FROM (
      SELECT 1 FROM sessions WHERE status='completed' GROUP BY student_name, student_id, section
    )
  `);
  return Number((res.rows[0] as Record<string, unknown>).total ?? 0);
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

export async function getAllCompletedScores(env: Env): Promise<number[]> {
  const db = getDb(env);
  const res = await db.execute(`SELECT simulation_score FROM sessions WHERE status = 'completed'`);
  return res.rows.map(r => Number((r as Record<string, unknown>).simulation_score ?? 0));
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

