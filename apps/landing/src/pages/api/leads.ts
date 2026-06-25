import type { APIRoute } from 'astro';
import { getDb, getEnv } from '../../lib/db';

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
    const { username, email, message } = await request.json() as { username?: string; email?: string; message?: string };
    
    if (!username || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'Username and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // Quick simple hash of client IP for privacy
    let ipHash = 'unknown';
    if (clientIp) {
      const encoder = new TextEncoder();
      const data = encoder.encode(clientIp);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    }

    const db = getDb(env);
    await db.execute({
      sql: `
        INSERT INTO leads (username, email, message, ip_hash)
        VALUES (?, ?, ?, ?)
      `,
      args: [username, email, message ?? null, ipHash]
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error saving lead:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Database error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
