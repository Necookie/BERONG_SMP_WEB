import type { APIRoute } from 'astro';
import { getSessionById } from '../../../../lib/queries';
import { getEnv } from '../../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const env = await getEnv();
  if (!env || !params.id) return new Response('Not found', { status: 404 });

  const session = await getSessionById(env, Number(params.id));
  if (!session) return new Response('Session not found', { status: 404 });

  if (!session.move_log_csv) {
    return new Response('No move log data for this session', { status: 404 });
  }

  return new Response(session.move_log_csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="move_log_session_${params.id}.csv"`,
    },
  });
};
