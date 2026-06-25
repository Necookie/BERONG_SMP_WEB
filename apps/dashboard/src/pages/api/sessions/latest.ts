import type { APIRoute } from 'astro';
import { getDb, getEnv } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const env = await getEnv();
  if (!env) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb(env);
  try {
    const res = await db.execute(`
      SELECT id, student_name, student_id, section, start_time, end_time, status,
             simulation_type, simulation_score, passed, prep_level
      FROM sessions
      WHERE status = 'completed'
      ORDER BY start_time DESC
      LIMIT 5
    `);

    return new Response(JSON.stringify(res.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('Error fetching latest sessions:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch sessions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
