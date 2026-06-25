import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/db';
import { getUserByUsername, createUser } from '../../../lib/queries';
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

    // Check if user already exists
    const existingUser = await getUserByUsername(env, trimmedUsername);
    if (existingUser) {
      return new Response(JSON.stringify({ ok: false, error: 'Username is already taken' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Automatically make 'necookie' the owner & active
    const isOwner = trimmedUsername.toLowerCase() === 'necookie';
    const role = isOwner ? 'owner' : 'admin';
    const status = isOwner ? 'active' : 'pending';

    const passwordHash = await hashPassword(password);
    await createUser(env, trimmedUsername, passwordHash, role, status);

    return new Response(JSON.stringify({ ok: true, pending: !isOwner }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in registration:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Registration error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
