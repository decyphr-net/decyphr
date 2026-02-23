import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deliverMagicLinkEmail, generateMagicLink } from '$lib/server/magic-link';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    const { verifyUrl } = await generateMagicLink(email);
    await deliverMagicLinkEmail(email, verifyUrl);

    return json({ message: 'Magic link sent!' }, { status: 200 });
  } catch (error) {
    console.error('Failed to issue magic link in web app', error);
    return json({ error: 'Failed to send magic link' }, { status: 500 });
  }
};
