import type { APIRoute } from 'astro';
import { getEnv } from '../../../../lib/db';
import { validateSession, getUserByUsername, updateUsername } from '../../../../lib/queries';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const env = await getEnv();
  if (!env) {
    return new Response(JSON.stringify({ ok: false, error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionToken = cookies.get('session_token')?.value;
  if (!sessionToken) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionData = await validateSession(env, sessionToken);
  if (!sessionData) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { username } = await request.json() as { username?: string };
    const trimmedUsername = (username ?? '').trim();

    if (trimmedUsername.length < 3) {
      return new Response(JSON.stringify({ ok: false, error: 'Username must be at least 3 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (trimmedUsername === sessionData.user.username) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existingUser = await getUserByUsername(env, trimmedUsername);
    if (existingUser) {
      return new Response(JSON.stringify({ ok: false, error: 'Username is already taken' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await updateUsername(env, sessionData.user.id, trimmedUsername);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error updating username:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Database error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
