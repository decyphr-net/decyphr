import { Injectable } from '@nestjs/common';

@Injectable()
export class ChallengesService {
  private readonly challengesUrl =
    process.env.CHALLENGES_SERVICE_URL || 'http://challenges:3016';

  private async parseResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const body = contentType.includes('application/json')
        ? JSON.stringify(await res.json())
        : await res.text();
      throw new Error(`Challenges service error (${res.status}): ${body}`);
    }

    if (res.status === 204) return null;
    if (contentType.includes('application/json')) return res.json();
    return res.text();
  }

  private async fetchWithRetry(url: string, init?: RequestInit, retries = 2) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  private buildUrl(
    path: string,
    clientId: string,
    query?: Record<string, string | undefined>,
  ) {
    const url = new URL(`${this.challengesUrl}${path}`);
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
    let res: Response;
    try {
      res = await this.fetchWithRetry(this.buildUrl(path, clientId, query));
    } catch (error) {
      throw new Error(
        `Challenges service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.parseResponse(res);
  }

  async patch(path: string, clientId: string, body?: unknown, query?: Record<string, string | undefined>) {
    let res: Response;
    try {
      res = await this.fetchWithRetry(this.buildUrl(path, clientId, query), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body == null ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(
        `Challenges service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.parseResponse(res);
  }
}
