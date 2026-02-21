import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ulid } from 'ulid';

import { AuthService } from 'src/auth/auth.service';
import { TranslationsService } from 'src/translations/translations.service';
import { KafkaService } from 'src/utils/kafka/kafka.service';

interface StatementEventInput {
  statementId?: string; // optional for new statements
  clientId: string;
  changes: {
    text: string;
    translation?: string;
    pronunciation?: string;
    notes?: string;
  };
  interaction: {
    type: string;
    timestamp: number;
  };
  autoTranslate?: boolean;
}

@Injectable()
export class LexiconService {
  private readonly logger = new Logger(LexiconService.name);

  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly kafka: KafkaService,
    private readonly translationsService: TranslationsService,
    private readonly authService: AuthService,
  ) { }

  /**
   * Get a user's lexicon with words and scores
   */
  async getUserLexicon(clientId: string, lang: string) {
    try {
      const priorityKey = `user:${clientId}:priority:${lang}`;

      const flat = await this.redis.zrange(priorityKey, 0, -1, 'WITHSCORES');

      if (!flat.length) return [];

      // Convert flat array to array of { id, score }
      const wordIdsWithScores = [];
      for (let i = 0; i < flat.length; i += 2) {
        wordIdsWithScores.push({
          id: flat[i],
          score: parseFloat(flat[i + 1]),
        });
      }

      const wordIds = wordIdsWithScores.map((item) => item.id);

      // Fetch words from lexicon:words hash
      const pipeline = this.redis.pipeline();
      wordIds.forEach((id) => pipeline.hget('lexicon:words', id));
      const wordResults = await pipeline.exec();

      return wordIdsWithScores.map((item, idx) => ({
        id: item.id,
        score: item.score,
        word: wordResults[idx][1] || null,
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch lexicon for ${clientId}`, err);
      return [];
    }
  }

  async importWords(payload: {
    clientId: string;
    targetLanguage: string;
    words: string[];
    interaction: any;
  }) {
    const enrichedPayload = {
      requestId: crypto.randomUUID(),
      clientId: payload.clientId,
      targetLanguage: payload.targetLanguage,
      words: payload.words,
      interaction: {
        type: payload.interaction.type,
        timestamp: payload.interaction.timestamp
          ? Date.parse(payload.interaction.timestamp)
          : Date.now(),
      },
    };

    await this.kafka.emit('lexicon.import', {
      key: payload.clientId,
      value: enrichedPayload,
    });
  }

  async handleStatementEvent(input: StatementEventInput) {
    const user = await this.authService.findUserByClientId(input.clientId);
    const isNew = !input.statementId;

    const requestId = ulid();

    const event = {
      key: input.statementId || ulid(),
      value: {
        requestId,
        statementId: input.statementId || ulid(),
        clientId: input.clientId,
        changes: input.changes,
        language: user.languageSettings?.[0]?.targetLanguage,
        interaction: input.interaction,
        type: isNew ? 'statement_created' : 'statement_updated',
        autoTranslate: input.autoTranslate ?? false,
        timestamp: Date.now(),
      },
    };

    await this.kafka.emit('statement.events', event);

    // Optionally trigger translation if requested
    if (input.autoTranslate) {
      await this.translationsService.emitTranslationRequest({
        clientId: input.clientId,
        text: input.changes.text,
        sourceLanguage: user.languageSettings?.[0]?.firstLanguage,
        targetLanguage: user.languageSettings?.[0]?.targetLanguage,
        statementId: input.statementId || null,
        requestId,
      });
    }
  }
}
