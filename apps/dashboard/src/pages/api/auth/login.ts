import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/db';
import { getUserByUsername, createSession } from '../../../lib/queries';
import { verifyPassword, generateSessionToken } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
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

    const user = await getUserByUsername(env, username.trim());
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid username or password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid username or password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = generateSessionToken();
    const duration = 7 * 24 * 60 * 60 * 1000; // 7 days
    const expiresAt = new Date(Date.now() + duration).toISOString();

    await createSession(env, user.id, token, expiresAt);

    cookies.set('session_token', token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: duration / 1000,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error logging in:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Authentication error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
