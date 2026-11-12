import type { APIRoute } from 'astro';
import { getDb, getEnv } from '../../lib/db';

export const prerender = false;

// The GitHub Pages copy of the landing page posts here cross-origin.
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://necookie.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin',
};

// CORS preflight for the JSON POST below.
export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers: HEADERS });

export const POST: APIRoute = async ({ request }) => {
  const env = await getEnv();
  if (!env) {
    return new Response(JSON.stringify({ ok: false, error: 'Database not configured' }), {
      status: 503,
      headers: HEADERS,
    });
  }

  try {
    const { username, email, message } = await request.json() as { username?: string; email?: string; message?: string };
    
    if (!username || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'Username and email are required' }), {
        status: 400,
        headers: HEADERS,
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
      headers: HEADERS,
    });
  } catch (err) {
    console.error('Error saving lead:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Database error' }),
      {
        status: 500,
        headers: HEADERS,
      }
    );
  }
};
