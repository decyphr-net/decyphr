// src/phrasebook/phrasebook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Kafka, EachMessagePayload } from 'kafkajs';
import { randomUUID } from 'crypto';
import { UpdatePhraseDto } from './phrasebook.dto';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { KafkaService } from 'src/utils/kafka/kafka.service';

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

  private sseClients: Array<{ clientId: string; res: any }> = [];

  constructor(
    private readonly authService: AuthService,
    private readonly kafkaService: KafkaService,
  ) {
    this.kafka = new Kafka({
      clientId: 'phrasebook-service',
      brokers: ['kafka:9092'],
    });
    this.consumer = this.kafka.consumer({ groupId: 'phrasebook-sse-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'phrasebook.events' });

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          const value =
            payload && typeof payload === 'object' && 'value' in payload
              ? payload.value
              : payload;
          const event =
            typeof value === 'string' ? JSON.parse(value) : value;

          const data = JSON.stringify(event);

          this.sseClients
            .filter((client) => client.clientId === event.clientId)
            .forEach((client) => client.res.write(`data: ${data}\n\n`));
        } catch (err) {
          this.logger.error('Failed to process Kafka message', err);
        }
      },
    });
  }

  // ---------------- SSE ----------------

  registerSseClient(clientId: string, res: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => res.write(':\n\n'), 15000);
    this.sseClients.push({ clientId, res });

    res.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients = this.sseClients.filter((c) => c.res !== res);
    });
  }

  broadcastUpdate(payload: any) {
    const data = JSON.stringify(payload);
    this.sseClients.forEach((client) =>
      client.res.write(`data: ${data}\n\n`),
    );
  }

  // ---------------- CRUD ----------------

  async getPhrasebook(clientId: string) {
    const res = await fetch(
      `${this.phrasebookUrl}/phrases?clientId=${encodeURIComponent(clientId)}`,
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
    const requestId = randomUUID();

    const payload: any = {
      action: 'create',
      requestId,
      clientId,
      data: {
        language,
        source: 'statement_created',
        ...body,
      },
    };

    await this.kafkaService.emit('phrasebook.commands', {
      key: requestId,
      value: payload,
    });

    return { accepted: true, requestId };
  }

  async updatePhrase(id: string, clientId: string, body: UpdatePhraseDto) {
    const requestId = randomUUID();
    await this.kafkaService.emit('phrasebook.commands', {
      key: requestId,
      value: {
        action: 'update',
        requestId,
        clientId,
        phraseId: Number(id),
        data: body,
      },
    });
    return { accepted: true, requestId };
  }

  async deletePhrase(id: string, clientId: string) {
    const requestId = randomUUID();
    await this.kafkaService.emit('phrasebook.commands', {
      key: requestId,
      value: {
        action: 'delete',
        requestId,
        clientId,
        phraseId: Number(id),
      },
    });
    return { accepted: true, requestId };
  }

  async generateTranslation(id: string, clientId: string) {
    const requestId = randomUUID();
    await this.kafkaService.emit('phrasebook.commands', {
      key: requestId,
      value: {
        action: 'translate',
        requestId,
        clientId,
        phraseId: Number(id),
      },
    });
    return { accepted: true, requestId };
  }
}
