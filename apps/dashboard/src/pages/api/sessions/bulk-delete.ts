import type { APIRoute } from 'astro';
import { getDb, getEnv } from '../../../lib/db';
import { logAuditEvent, getSessionById } from '../../../lib/queries';

export const POST: APIRoute = async ({ request }) => {
  const env = await getEnv();
  if (!env) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { ids } = await request.json() as { ids: any };
    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'No IDs provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const numericIds = ids.map(Number).filter(id => Number.isFinite(id) && id > 0);
    if (numericIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid IDs provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const db = getDb(env);

    // Fetch details for all sessions to be deleted for audit logging
    const sessionsToDelete = [];
    for (const id of numericIds) {
      const session = await getSessionById(env, id);
      if (session) {
        sessionsToDelete.push(session);
      }
    }

    // Run delete inside a transaction
    const tx = await db.transaction("write");
    try {
      for (const id of numericIds) {
        await tx.execute({
          sql: `DELETE FROM sessions WHERE id = ?`,
          args: [id]
        });
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }

    // Write audit logs for deleted sessions
    for (const s of sessionsToDelete) {
      const oldValues = {
        student_name: s.student_name,
        student_id: s.student_id,
        section: s.section,
        simulation_type: s.simulation_type,
        simulation_score: s.simulation_score,
        prep_level: s.prep_level,
        passed: s.passed,
      };
      await logAuditEvent(env, 'delete', s.id, oldValues, null);
    }

    return new Response(JSON.stringify({ deleted: numericIds.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in bulk delete API:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown database error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
