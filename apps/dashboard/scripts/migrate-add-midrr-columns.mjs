/**
 * Adds the MiDRR ML API result columns to `sessions`, if not already present.
 * Idempotent: ADD COLUMN failures (column already exists) are swallowed.
 *
 * Run: node apps/dashboard/scripts/migrate-add-midrr-columns.mjs
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

async function addColumn(sql) {
  try {
    await pipeline([ex(sql)]);
    console.log(`  applied: ${sql}`);
  } catch (err) {
    console.log(`  skipped (likely exists): ${sql}`);
  }
}

const columns = [
  "ALTER TABLE sessions ADD COLUMN midrr_prep_level TEXT",
  "ALTER TABLE sessions ADD COLUMN midrr_prep_score REAL",
  "ALTER TABLE sessions ADD COLUMN midrr_result_text TEXT",
  "ALTER TABLE sessions ADD COLUMN midrr_feature_importance TEXT",
  "ALTER TABLE sessions ADD COLUMN midrr_features TEXT",
  "ALTER TABLE sessions ADD COLUMN midrr_predicted_at TEXT",
];

console.log("Migrating sessions table for MiDRR columns...");
for (const sql of columns) await addColumn(sql);
console.log("Done.");
