import type { APIRoute } from 'astro';
import { getEnv } from '../../../../lib/db';
import { validateSession, getUserByUsername, createUser } from '../../../../lib/queries';
import { hashPassword } from '../../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const env = await getEnv();
  if (!env) {
    return new Response(JSON.stringify({ ok: false, error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only the owner can add new admin/staff accounts
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

  try {
    const { username, password } = await request.json() as { username?: string; password?: string };
    if (!username || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Username and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return new Response(JSON.stringify({ ok: false, error: 'Username must be at least 3 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ ok: false, error: 'Password must be at least 6 characters' }), {
        status: 400,
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

    // Owner-created accounts are active immediately — no approval step needed
    const passwordHash = await hashPassword(password);
    await createUser(env, trimmedUsername, passwordHash, 'admin', 'active');

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error creating user:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Database error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
