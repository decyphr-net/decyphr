import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { v4 as uuidv4 } from 'uuid';
import { sessionCookieName, signSession } from '$lib/server/auth';
import { verifyMagicLink } from '$lib/server/magic-link';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const token = String(body?.token || '');
    const email = String(body?.email || '').trim().toLowerCase();

    if (!token || !email) {
      return json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await verifyMagicLink(email, token);

    const signed = await signSession({
      userId: user.id,
      clientId: user.clientId,
      email: user.email,
      sessionId: uuidv4()
    });

    event.cookies.set(sessionCookieName(), signed, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7
    });

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status =
      message === 'Invalid token' ? 401 : message === 'Token expired' ? 410 : message === 'Token not found' ? 404 : 500;

    return json({ error: message }, { status });
  }
};
