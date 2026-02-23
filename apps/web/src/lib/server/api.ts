import type { RequestEvent } from '@sveltejs/kit';

export async function nestFetch(
  event: RequestEvent,
  path: string,
  init: RequestInit = {},
  requireAuth = true
) {
  const baseUrl = process.env.NEST_INTERNAL_URL || 'http://client:8000';
  const headers = new Headers(init.headers || {});

  if (requireAuth) {
    if (!event.locals.auth) {
      throw new Error('Unauthenticated');
    }

    headers.set('x-user-id', String(event.locals.auth.userId));
    headers.set('x-client-id', event.locals.auth.clientId);
    headers.set('x-session-id', event.locals.auth.sessionId);
    if (event.locals.auth.email) {
      headers.set('x-user-email', event.locals.auth.email);
    }
    if (process.env.INTERNAL_AUTH_SECRET) {
      headers.set('x-internal-auth', process.env.INTERNAL_AUTH_SECRET);
    }
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers
  });
}
