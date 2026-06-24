import type { APIRoute } from 'astro';
import { getEnv } from '../../../../lib/db';
import { deleteSession } from '../../../../lib/queries';

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
