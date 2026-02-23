import { Injectable } from '@nestjs/common';

@Injectable()
export class FocusGatewayService {
  private readonly focusUrl = process.env.FOCUS_SERVICE_URL || 'http://focus:3013';

  private async parseResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const body = contentType.includes('application/json')
        ? JSON.stringify(await res.json())
        : await res.text();
      throw new Error(`Focus service error (${res.status}): ${body}`);
    }

    if (res.status === 204) return null;
    if (contentType.includes('application/json')) return res.json();
    return res.text();
  }

  private buildUrl(path: string, clientId: string, query?: Record<string, string | undefined>) {
    const url = new URL(`${this.focusUrl}${path}`);
    url.searchParams.set('clientId', clientId);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value != null && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }

  async get(path: string, clientId: string, query?: Record<string, string | undefined>) {
    const res = await fetch(this.buildUrl(path, clientId, query));
    return this.parseResponse(res);
  }

  async post(path: string, clientId: string, body?: unknown, query?: Record<string, string | undefined>) {
    const res = await fetch(this.buildUrl(path, clientId, query), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
    return this.parseResponse(res);
  }

  async patch(path: string, clientId: string, body?: unknown, query?: Record<string, string | undefined>) {
    const res = await fetch(this.buildUrl(path, clientId, query), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
    return this.parseResponse(res);
  }
}
