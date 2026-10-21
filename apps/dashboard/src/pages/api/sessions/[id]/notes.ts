import type { APIRoute } from 'astro';
import { getDb, getEnv } from '../../../../lib/db';
import { getSessionById, logAuditEvent } from '../../../../lib/queries';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const env = await getEnv();
  if (!env) {
    return new Response('DB not configured', { status: 503 });
  }

  const form = await request.formData();
  const notes = (form.get('notes') as string | null) ?? '';
  const id = Number(params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return new Response('Invalid session id', { status: 400 });
  }

  // Read the current note first so the audit row can show what it was before this change.
  const before = await getSessionById(env, id);
  if (!before) {
    return new Response('Session not found', { status: 404 });
  }

  const db = getDb(env);
  await db.execute(`UPDATE sessions SET bfp_notes = ? WHERE id = ?`, [notes, id]);

  // Notes are reviewer evidence like the level and score, so a changed note is audited the same way.
  if ((before.bfp_notes ?? '') !== notes) {
    await logAuditEvent(env, 'notes', id, { bfp_notes: before.bfp_notes ?? null }, { bfp_notes: notes }, locals.user?.username);
  }

  return new Response(null, {
    status: 303,
    headers: { Location: `/sessions/${id}` },
  });
};
