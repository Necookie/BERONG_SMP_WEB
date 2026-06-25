import { defineMiddleware } from 'astro:middleware';
import { getEnv } from './lib/db';
import { validateSession } from './lib/queries';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Exempt login, setup, and api routes from redirection
  if (pathname === '/login' || pathname === '/setup' || pathname.startsWith('/api/')) {
    return next();
  }

  const env = await getEnv();
  if (!env) {
    // If DB is not configured, we let it pass to error boundaries
    return next();
  }

  const sessionToken = context.cookies.get('session_token')?.value;
  if (!sessionToken) {
    return context.redirect('/login');
  }

  const sessionData = await validateSession(env, sessionToken);
  if (!sessionData) {
    // Clear invalid cookie
    context.cookies.delete('session_token', { path: '/' });
    return context.redirect('/login');
  }

  // Store user data in locals for use in pages if needed
  context.locals.user = sessionData.user;

  return next();
});
