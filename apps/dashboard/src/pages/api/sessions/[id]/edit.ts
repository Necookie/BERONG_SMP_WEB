import type { APIRoute } from 'astro';
import { getEnv } from '../../../../lib/db';
import { updateSessionDetails, getSessionById, logAuditEvent } from '../../../../lib/queries';

export const POST: APIRoute = async ({ params, request }) => {
  const env = await getEnv();
  if (!env) {
    return new Response('DB not configured', { status: 503 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return new Response('Invalid session id', { status: 400 });
  }

  const form = await request.formData();
  const student_name = form.get('student_name') as string;
  const student_id = form.get('student_id') as string | null;
  const section = form.get('section') as string | null;
  const simulation_type = form.get('simulation_type') as 'FIRE' | 'EARTHQUAKE' | null;
  const simulation_score = Number(form.get('simulation_score') ?? 0);
  const prep_level = form.get('prep_level') as 'HIGH' | 'MODERATE' | 'LOW' | 'PENDING' | null;
  const passed = Number(form.get('passed') ?? 0);

  if (!student_name || student_name.trim() === '') {
    return new Response('Student name is required', { status: 400 });
  }

  try {
    const oldSession = await getSessionById(env, id);
    if (!oldSession) {
      return new Response('Session not found', { status: 404 });
    }

    const oldValues = {
      student_name: oldSession.student_name,
      student_id: oldSession.student_id,
      section: oldSession.section,
      simulation_type: oldSession.simulation_type,
      simulation_score: oldSession.simulation_score,
      prep_level: oldSession.prep_level,
      passed: oldSession.passed,
    };

    const newValues = {
      student_name: student_name.trim(),
      student_id: student_id && student_id.trim() !== '' ? student_id.trim() : null,
      section: section && section.trim() !== '' ? section.trim() : null,
      simulation_type,
      simulation_score: Number.isFinite(simulation_score) ? Math.max(0, Math.min(100, simulation_score)) : 0,
      prep_level: prep_level === 'PENDING' ? null : prep_level,
      passed: passed === 1 ? 1 : 0,
    };

    await updateSessionDetails(env, id, {
      student_name: newValues.student_name,
      student_id: newValues.student_id,
      section: newValues.section,
      simulation_type: newValues.simulation_type,
      simulation_score: newValues.simulation_score,
      prep_level: newValues.prep_level,
      passed: newValues.passed,
    });

    await logAuditEvent(env, 'edit', id, oldValues, newValues);

    return new Response(null, {
      status: 303,
      headers: { Location: `/sessions/${id}` },
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return new Response('Failed to update session details', { status: 500 });
  }
};
