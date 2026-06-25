import type { APIRoute } from 'astro';
import { getDb, getEnv } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const env = await getEnv();
  if (!env) {
    return new Response('Database not configured', { status: 503 });
  }

  const db = getDb(env);

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

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Process streaming asynchronously
  (async () => {
    try {
      // Write the CSV header
      await writer.write(encoder.encode(csvRow(fields) + '\r\n'));

      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const res = await db.execute({
          sql: `
            SELECT id, student_name, student_id, section, station_account,
                   start_time, end_time, status, tutorial_completed, tutorial_duration_s,
                   simulation_type, simulation_score, passed, prep_level, confidence,
                   bfp_notes
            FROM sessions
            WHERE status = 'completed'
            ORDER BY start_time DESC
            LIMIT ? OFFSET ?
          `,
          args: [limit, offset]
        });

        if (res.rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of res.rows) {
          const r = row as Record<string, unknown>;
          const csvLine = csvRow(fields.map(f => r[f] as string | number | null));
          await writer.write(encoder.encode(csvLine + '\r\n'));
        }

        if (res.rows.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    } catch (err) {
      console.error('Error streaming CSV export:', err);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sessions_live.csv"',
    },
  });
};
