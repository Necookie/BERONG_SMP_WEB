import type { APIRoute } from 'astro';
import { getSessionLog } from '../../../../lib/queries';
import { getEnv } from '../../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const env = await getEnv();
  if (!env || !params.id) return new Response('Not found', { status: 404 });

  // Only the log column: the full row would also pull the (possibly multi-MB) event_log.
  const log = await getSessionLog(env, Number(params.id), 'move_log_csv');
  if (log === null) return new Response('Session not found', { status: 404 });

  if (!log) {
    return new Response('No move log data for this session', { status: 404 });
  }

  return new Response(log, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="move_log_session_${params.id}.csv"`,
    },
  });
};
