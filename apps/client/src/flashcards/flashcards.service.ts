import { Injectable } from '@nestjs/common';

export interface FlashcardPackCreatePayload {
  name: string;
  description?: string;
  language?: string;
  cards?: Array<{
    front: string;
    back: string;
    pronunciation?: string;
    notes?: string;
    dueInDays?: number;
  }>;
}

@Injectable()
export class FlashcardsService {
  private readonly flashcardsUrl = 'http://flashcards:3012';

  private async parseResponse(res: Response) {
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Flashcards service error (${res.status}): ${body}`);
    }

    if (res.status === 204) {
      return null;
    }

    return res.json();
  }

  async getDecks(clientId: string) {
    const res = await fetch(
      `${this.flashcardsUrl}/packs?clientId=${encodeURIComponent(clientId)}`,
    );
    return this.parseResponse(res);
  }

  async getDeck(clientId: string, packId: number) {
    const res = await fetch(
      `${this.flashcardsUrl}/packs/${packId}?clientId=${encodeURIComponent(clientId)}`,
    );
    return this.parseResponse(res);
  }

  async createDeck(clientId: string, payload: FlashcardPackCreatePayload) {
    const res = await fetch(
      `${this.flashcardsUrl}/packs?clientId=${encodeURIComponent(clientId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    return this.parseResponse(res);
  }

  async createCard(
    clientId: string,
    packId: number,
    payload: {
      front: string;
      back: string;
      pronunciation?: string;
      notes?: string;
      dueInDays?: number;
    },
  ) {
    const res = await fetch(
      `${this.flashcardsUrl}/packs/${packId}/cards?clientId=${encodeURIComponent(clientId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    return this.parseResponse(res);
  }

  async getDueCards(clientId: string, packId?: number, limit: number = 20) {
    const params = new URLSearchParams({
      clientId,
      limit: String(limit),
    });

    if (packId) {
      params.set('packId', String(packId));
    }

    const res = await fetch(`${this.flashcardsUrl}/study/due?${params.toString()}`);
    return this.parseResponse(res);
  }

  async recordAttempt(
    clientId: string,
    cardId: number,
    payload: { grade: 'again' | 'hard' | 'good' | 'easy'; responseMs?: number },
  ) {
    const res = await fetch(
      `${this.flashcardsUrl}/cards/${cardId}/attempt?clientId=${encodeURIComponent(clientId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    return this.parseResponse(res);
  }
}
