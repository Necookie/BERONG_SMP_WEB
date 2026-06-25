import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/db';
import { hasAnyUsers, createUser } from '../../../lib/queries';
import { hashPassword } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const env = await getEnv();
  if (!env) {
    return new Response(JSON.stringify({ ok: false, error: 'Database not configured' }), {
      status: 503,
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

    // Verify setup is allowed
    const usersExist = await hasAnyUsers(env);
    if (usersExist) {
      return new Response(JSON.stringify({ ok: false, error: 'Setup already completed' }), {
        status: 403,
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

    const passwordHash = await hashPassword(password);
    await createUser(env, trimmedUsername, passwordHash);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in setup:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Setup error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
