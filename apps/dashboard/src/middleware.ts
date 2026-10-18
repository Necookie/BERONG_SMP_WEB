import { defineMiddleware } from 'astro:middleware';
import { getEnv } from './lib/db';
import { validateSession } from './lib/queries';

// Every other /api/* route reads or changes student data and requires a valid session.
const PUBLIC_API_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/api/auth/setup',
]);

function unauthorized(): Response {
  return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Login/setup pages and the pre-login auth endpoints stay public
  if (pathname === '/login' || pathname === '/setup' || PUBLIC_API_ROUTES.has(pathname)) {
    return next();
  }
  const isApi = pathname.startsWith('/api/');

  const env = await getEnv();
  if (!env) {
    // If DB is not configured, we let it pass to error boundaries
    return next();
  }

  const sessionToken = context.cookies.get('session_token')?.value;
  if (!sessionToken) {
    return isApi ? unauthorized() : context.redirect('/login');
  }

  const sessionData = await validateSession(env, sessionToken);
  if (!sessionData) {
    // Clear invalid cookie
    context.cookies.delete('session_token', { path: '/' });
    return isApi ? unauthorized() : context.redirect('/login');
  }

  // Store user data in locals for use in pages if needed
  context.locals.user = sessionData.user;

  return next();
});
