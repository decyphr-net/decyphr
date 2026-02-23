import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nestFetch } from '$lib/server/api';

async function forward(event: Parameters<RequestHandler>[0], method: string) {
  try {
    const path = '/' + (event.params.path || '');

    const headers = new Headers(event.request.headers);
    headers.delete('host');

    const init: RequestInit = {
      method,
      headers
    };

    if (method !== 'GET' && method !== 'HEAD') {
      init.body = await event.request.arrayBuffer();
    }

    const response = await nestFetch(event, path, init, true);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const payload = await response.json();
      return json(payload, { status: response.status });
    }

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { 'content-type': contentType || 'text/plain' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy error';
    const status = message === 'Unauthenticated' ? 401 : 502;
    return json({ error: message }, { status });
  }
}

export const GET: RequestHandler = (event) => forward(event, 'GET');
export const POST: RequestHandler = (event) => forward(event, 'POST');
export const PUT: RequestHandler = (event) => forward(event, 'PUT');
export const PATCH: RequestHandler = (event) => forward(event, 'PATCH');
export const DELETE: RequestHandler = (event) => forward(event, 'DELETE');
