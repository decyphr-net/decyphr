import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessionCookieName } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  event.cookies.delete(sessionCookieName(), { path: '/' });
  return json({ ok: true });
};
