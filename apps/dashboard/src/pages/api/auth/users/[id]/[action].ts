import type { APIRoute } from 'astro';
import { getEnv } from '../../../../../lib/db';
import { validateSession, updateUserStatus, deleteUser } from '../../../../../lib/queries';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const { id, action } = params;
  if (!id || !action) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = await getEnv();
  if (!env) {
    return new Response(JSON.stringify({ ok: false, error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Authenticate and verify role is 'owner'
  const sessionToken = cookies.get('session_token')?.value;
  if (!sessionToken) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionData = await validateSession(env, sessionToken);
  if (!sessionData || sessionData.user.role !== 'owner') {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid user ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (action === 'approve') {
      await updateUserStatus(env, userId, 'active');
    } else if (action === 'suspend') {
      await updateUserStatus(env, userId, 'suspended');
    } else if (action === 'delete') {
      await deleteUser(env, userId);
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`Error performing action ${action} on user ${id}:`, err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Database error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
