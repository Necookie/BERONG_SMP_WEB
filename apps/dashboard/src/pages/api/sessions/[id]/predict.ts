import type { APIRoute } from 'astro';
import { getEnv } from '../../../../lib/db';
import { getSessionById, updateSessionPrediction, validateSession } from '../../../../lib/queries';
import { getMidrrBaseUrl, runPrediction, MidrrApiError } from '../../../../lib/midrr';

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ params, cookies }) => {
  const { id } = params;
  const sessionId = Number(id);
  if (!id || Number.isNaN(sessionId)) {
    return json({ ok: false, error: 'Invalid session ID' }, 400);
  }

  const env = await getEnv();
  if (!env) {
    return json({ ok: false, error: 'Database not configured' }, 503);
  }

  const sessionToken = cookies.get('session_token')?.value;
  if (!sessionToken || !(await validateSession(env, sessionToken))) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const session = await getSessionById(env, sessionId);
  if (!session) {
    return json({ ok: false, error: 'Session not found' }, 404);
  }

  try {
    const baseUrl = await getMidrrBaseUrl();
    const result = await runPrediction(baseUrl, session);
    await updateSessionPrediction(env, sessionId, result);
    return json({ ok: true, ...result }, 200);
  } catch (err) {
    if (err instanceof MidrrApiError) {
      return json({ ok: false, error: err.message, detail: err.detail }, err.status ?? 502);
    }
    console.error(`MiDRR prediction failed for session ${sessionId}:`, err);
    return json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
};
