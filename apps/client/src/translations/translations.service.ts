import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Observable, Subject } from 'rxjs';
import { ulid } from 'ulid';

import { AuthService } from 'src/auth/auth.service';
import { KafkaService } from 'src/utils/kafka/kafka.service';
import { KTableService } from 'src/utils/kafka/ktable.service';
import { TranslationDto } from './dtos/translation.dto';

export interface InteractionEvent<T> {
  requestId: string;
  clientId: string;
  sourceLanguage: string;
  targetLanguage: string;
  interactions: Interaction[];
  payload: T;
}

export interface Interaction {
  type: string;
  timestamp: number;
}

@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);
  private joinCache = new Map<string, any>();

  constructor(
    private readonly ktableService: KTableService,
    private readonly authService: AuthService,
    private readonly kafkaService: KafkaService,
  ) { }

  async initKTableWatchers() {
    await this.ktableService.watchTable('translation.response.table');
    await this.ktableService.watchTable('nlp.complete');
  }

  renderLayout(partialPath: string, res: Response) {
    // read layout and inject partial route
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    return readFile(layoutPath, 'utf8').then((layout) => {
      res.send(layout.replace('{{PARTIAL_ROUTE}}', partialPath));
    });
  }

  sendPartial(res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public/pages/dashboard/translations/translations.html',
    );
    return res.sendFile(partialPath);
  }

  async submitTranslation(dto: TranslationDto) {
    const requestId = dto.requestId ?? ulid();
    await this.emitTranslationRequest({ ...dto, requestId });
    return { status: 'ok' };
  }

  async getClientTranslations(clientId: string) {
    const response = await fetch(`http://translator:3009/translations/${clientId}`);
    return response.json();
  }

  getSSEStream(clientId: string): Observable<MessageEvent> {
    this.logger.log(`📡 SSE connection opened for clientId=${clientId}`);

    const subject = new Subject<MessageEvent>();

    // ---- translation events
    this.ktableService.onUpdate(
      'translation.response.table',
      (requestId, translation) => {
        // Merge into cache
        const existing = this.joinCache.get(requestId) || {};
        this.joinCache.set(requestId, { ...existing, translation });

        // Only emit if this translation belongs to this client
        if (translation?.clientId === clientId) {
          subject.next({ data: { ...this.joinCache.get(requestId) } } as any);
        }
      },
    );

    // ---- NLP events
    this.ktableService.onUpdate('nlp.complete', (requestId, nlp) => {
      const existing = this.joinCache.get(requestId) || {};
      this.joinCache.set(requestId, { ...existing, nlp });

      // Emit only if the cached request belongs to this client
      const cached = this.joinCache.get(requestId);
      const ownerClientId = cached?.translation?.clientId;
      if (ownerClientId === clientId) {
        subject.next({ data: cached } as any);
      }
    });

    // optional: keep-alive ping, cleanup, etc.
    return subject.asObservable();
  }

  private normalizePayload(raw: any) {
    const id =
      raw.id ||
      raw.requestId ||
      `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const originalText =
      raw.originalText ||
      raw.sentences?.map((s: any) => s.text).join(' ') ||
      '';
    const translated = raw.translated || ''; // <- correct property name
    const createdAt = raw.createdAt || new Date().toISOString();
    const language = raw.language || 'ga';
    const sentences = Array.isArray(raw.sentences)
      ? raw.sentences.map((s) => ({
        ...s,
        tokens: Array.isArray(s.tokens) ? s.tokens : [],
      }))
      : [];
    const flatTokens = sentences.flatMap((s) => s.tokens);
    const loading = translated === '';

    return {
      id,
      originalText,
      translated,
      createdAt,
      language,
      sentences,
      flatTokens,
      loading,
    };
  }

  async emitTranslationRequest(dto: TranslationDto): Promise<void> {
    const user = await this.authService.findUserByClientId(dto.clientId);
    const sourceLanguage = user?.languageSettings?.[0]?.targetLanguage ?? 'ga';
    const targetLanguage = user?.languageSettings?.[0]?.firstLanguage ?? 'en';

    const event = {
      requestId: dto.requestId,
      clientId: dto.clientId,
      sourceLanguage,
      targetLanguage,
      statementId: dto.statementId,

      interactions: [
        {
          type: 'translate_text',
          timestamp: Date.now(),
        },
      ],

      payload: {
        text: dto.text,
      },
    };

    await this.kafkaService.emit('translation.translate', {
      key: dto.requestId,
      value: event,
    });
    this.logger.log(
      `📤 Emitted translation request for clientId=${dto.clientId}`,
    );
  }

  async createVault(text: string, lang: string, clientId: string) {
    const res = await fetch(process.env.TRANSLATOR_URL + '/vault/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang, clientId }),
    });

    const data = await res.json();
    console.log(data);
    return data.vaultId;
  }

  async getVaultList(clientId: string) {
    const url = new URL(process.env.TRANSLATOR_URL + '/vault/list');
    url.searchParams.set('clientId', clientId);
    const res = await fetch(url.toString());
    return res.json();
  }
}
