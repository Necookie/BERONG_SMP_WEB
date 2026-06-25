import type { APIRoute } from 'astro';
import { getEnv } from '../../../../lib/db';
import { deleteSession, getSessionById, logAuditEvent } from '../../../../lib/queries';

export const POST: APIRoute = async ({ params }) => {
  const env = await getEnv();
  if (!env) {
    return new Response('DB not configured', { status: 503 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return new Response('Invalid session id', { status: 400 });
  }

  try {
    const oldSession = await getSessionById(env, id);
    if (oldSession) {
      const oldValues = {
        student_name: oldSession.student_name,
        student_id: oldSession.student_id,
        section: oldSession.section,
        simulation_type: oldSession.simulation_type,
        simulation_score: oldSession.simulation_score,
        prep_level: oldSession.prep_level,
        passed: oldSession.passed,
      };
      await logAuditEvent(env, 'delete', id, oldValues, null);
    }

    await deleteSession(env, id);

    return new Response(null, {
      status: 303,
      headers: { Location: '/sessions' },
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return new Response('Failed to delete session', { status: 500 });
  }
};
