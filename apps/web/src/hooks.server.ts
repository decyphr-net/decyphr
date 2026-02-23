import type { Handle } from '@sveltejs/kit';
import { sessionCookieName, verifySession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(sessionCookieName());
  event.locals.auth = token ? await verifySession(token) : null;

  if (event.url.pathname.startsWith('/dashboard') && !event.locals.auth) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/auth/login' }
    });
  }

  return resolve(event);
};
