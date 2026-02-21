// src/phrasebook/phrasebook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Kafka, EachMessagePayload } from 'kafkajs';
import { UpdatePhraseDto } from './phrasebook.dto';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';

export interface PhrasebookStatement {
  id: string;
  text: string;
  translation?: string | null;
  pronunciation?: string | null;
  example?: string | null;
  notes?: string | null;
  tokens?: Array<{
    position: number;
    surface: string;
    lemma: string;
    pos: string;
  }>;
}

@Injectable()
export class PhrasebookService {
  private readonly logger = new Logger(PhrasebookService.name);
  private kafka: Kafka;
  private consumer: any;
  private phrasebookUrl = 'http://phrasebook:3011';

  private sseClients: any[] = [];

  constructor(private readonly authService: AuthService,) {
    this.kafka = new Kafka({
      clientId: 'phrasebook-service',
      brokers: ['kafka:9092'],
    });
    this.consumer = this.kafka.consumer({ groupId: 'phrasebook-sse-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'phrase.created' });
    await this.consumer.subscribe({ topic: 'phrase.updated' });

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());

          // normalize the shape
          const normalized: PhrasebookStatement = {
            id: String(payload.id),
            text: payload.text,
            translation: payload.translation ?? null,
            pronunciation: payload.pronunciation ?? null,
            example: payload.example ?? null,
            notes: payload.notes ?? null,
            tokens: payload.tokens ?? [],
          };

          const data = JSON.stringify({ type: topic, phrase: normalized });

          // send to all SSE clients
          this.sseClients.forEach((client) =>
            client.write(`data: ${data}\n\n`),
          );
        } catch (err) {
          this.logger.error('Failed to process Kafka message', err);
        }
      },
    });
  }

  // ---------------- SSE ----------------

  registerSseClient(res: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => res.write(':\n\n'), 15000);
    this.sseClients.push(res);

    res.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients = this.sseClients.filter((c) => c !== res);
    });
  }

  broadcastUpdate(payload: any) {
    const data = JSON.stringify(payload);
    this.sseClients.forEach((client) => client.write(`data: ${data}\n\n`));
  }

  // ---------------- CRUD ----------------

  async getPhrasebook(clientId: string) {
    const res = await fetch(`
      ${this.phrasebookUrl}/phrases?clientId=${encodeURIComponent(clientId)}
    );
    return res.json();
  }

  async getPhrase(id: string) {
    const res = await fetch(`${this.phrasebookUrl}/phrases/${id}`);
    return res.json();
  }

  async createPhrase(req: AuthenticatedRequest, body: UpdatePhraseDto) {
    const clientId = await this.authService.getClientIdFromSession(req);
    const user = await this.authService.findUserByClientId(clientId);
    const language = user.languageSettings?.[0]?.targetLanguage;

    const payload = {
      clientId,
      language,
      source: 'statement_created',
      ...body,
    };

    const res = await fetch(`${this.phrasebookUrl}/phrases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log(res)

    return res.json();
  }

  async updatePhrase(id: string, clientId: string, body: UpdatePhraseDto) {
    const res = await fetch(`${this.phrasebookUrl}/phrases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, ...body }),
    });
    return res.json();
  }

  async deletePhrase(id: string) {
    const res = await fetch(`${this.phrasebookUrl}/phrases/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  }

  async generateTranslation(id: string, clientId: string) {
    const res = await fetch(`${this.phrasebookUrl}/phrases/${id}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });
    return res.json();
  }
}
