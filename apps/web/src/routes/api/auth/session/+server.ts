import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.auth) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  return json({
    userId: locals.auth.userId,
    clientId: locals.auth.clientId,
    email: locals.auth.email
  });
};
