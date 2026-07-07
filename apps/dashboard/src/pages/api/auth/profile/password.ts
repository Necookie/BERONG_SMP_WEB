import type { APIRoute } from 'astro';
import { getEnv } from '../../../../lib/db';
import { validateSession, updatePasswordHash } from '../../../../lib/queries';
import { hashPassword, verifyPassword } from '../../../../lib/auth';

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
    const { currentPassword, newPassword } = await request.json() as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ ok: false, error: 'Current and new password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ ok: false, error: 'New password must be at least 6 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isMatch = await verifyPassword(currentPassword, sessionData.user.password_hash);
    if (!isMatch) {
      return new Response(JSON.stringify({ ok: false, error: 'Current password is incorrect' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await updatePasswordHash(env, sessionData.user.id, passwordHash);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error updating password:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Database error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
