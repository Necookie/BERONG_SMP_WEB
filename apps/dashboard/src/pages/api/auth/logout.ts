import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/db';
import { deleteSessionToken } from '../../../lib/queries';

export const prerender = false;

export const ALL: APIRoute = async ({ cookies, redirect }) => {
  const env = await getEnv();
  const token = cookies.get('session_token')?.value;

  if (env && token) {
    try {
      await deleteSessionToken(env, token);
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  }

  cookies.delete('session_token', { path: '/' });
  return redirect('/login');
};
