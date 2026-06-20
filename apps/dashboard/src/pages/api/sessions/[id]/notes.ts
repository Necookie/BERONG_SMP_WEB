import type { APIRoute } from 'astro';
import { getDb, getEnv } from '../../../../lib/db';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const env = getEnv(locals);
  if (!env) {
    return new Response('DB not configured', { status: 503 });
  }

  const form = await request.formData();
  const notes = (form.get('notes') as string | null) ?? '';
  const id = Number(params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return new Response('Invalid session id', { status: 400 });
  }

  const db = getDb(env);
  await db.execute(`UPDATE sessions SET bfp_notes = ? WHERE id = ?`, [notes, id]);

  return new Response(null, {
    status: 303,
    headers: { Location: `/sessions/${id}` },
  });
};
