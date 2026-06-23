import type { APIRoute } from 'astro';
import { getDb, getEnv } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const env = await getEnv();
  if (!env) {
    return new Response('Database not configured', { status: 503 });
  }

  const db = getDb(env);
  const res = await db.execute(`
    SELECT id, student_name, student_id, section, station_account,
           start_time, end_time, status, tutorial_completed, tutorial_duration_s,
           simulation_type, simulation_score, passed, prep_level, confidence,
           bfp_notes
    FROM sessions
    WHERE status = 'completed'
    ORDER BY start_time DESC
  `);

  const fields = [
    'id', 'student_name', 'student_id', 'section', 'station_account',
    'start_time', 'end_time', 'status', 'tutorial_completed', 'tutorial_duration_s',
    'simulation_type', 'simulation_score', 'passed', 'prep_level', 'confidence',
    'bfp_notes',
  ];

  const csvRow = (vals: (string | number | null | undefined)[]) =>
    vals.map(v => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',');

  const lines: string[] = [csvRow(fields)];
  for (const row of res.rows) {
    const r = row as Record<string, unknown>;
    lines.push(csvRow(fields.map(f => r[f] as string | number | null)));
  }

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sessions_live.csv"',
    },
  });
};
