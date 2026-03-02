import type { RequestHandler } from './$types';
import { nestFetch } from '$lib/server/api';

export const GET: RequestHandler = async (event) => {
  if (!event.locals.auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await nestFetch(
      event,
      '/phrasebook/stream',
      {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
      },
      true,
    );
  } catch (error) {
    console.error('Phrasebook stream upstream fetch failed', error);
    return new Response('Failed to open stream', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('Failed to open stream', { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
};
