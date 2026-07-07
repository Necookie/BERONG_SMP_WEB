/**
 * Adds indexes supporting the sessions/roster query patterns (status+start_time
 * lookups, roster GROUP BY, per-request admin_sessions token lookup). Idempotent:
 * uses CREATE INDEX IF NOT EXISTS.
 *
 * Run: node apps/dashboard/scripts/migrate-add-indexes.mjs
 * Needs: apps/dashboard/.dev.vars with TURSO_URL and TURSO_TOKEN.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const devVars = readFileSync(resolve(__dir, "../.dev.vars"), "utf8");
const env = Object.fromEntries(
  devVars.split("\n").filter(l => l.includes("=")).map(l => l.split("=").map(s => s.trim()))
);
const TURSO_URL   = env.TURSO_URL;
const TURSO_TOKEN = env.TURSO_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) { console.error("Missing TURSO_URL or TURSO_TOKEN in .dev.vars"); process.exit(1); }

async function pipeline(requests) {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  for (const r of json.results ?? [])
    if (r.type === "error") throw new Error(`Turso SQL error: ${r.error?.message ?? JSON.stringify(r)}`);
  return json;
}
const ex = sql => ({ type: "execute", stmt: { sql } });

async function applyIndex(sql) {
  try {
    await pipeline([ex(sql)]);
    console.log(`  applied: ${sql}`);
  } catch (err) {
    console.log(`  skipped: ${sql} (${err.message})`);
  }
}

const indexes = [
  "CREATE INDEX IF NOT EXISTS idx_sessions_status_start_time ON sessions(status, start_time DESC)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_student_name ON sessions(student_name)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_section ON sessions(section)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_simulation_type ON sessions(simulation_type)",
  "CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token)",
  "CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id)",
];

console.log("Adding indexes...");
for (const sql of indexes) await applyIndex(sql);
console.log("Done.");
