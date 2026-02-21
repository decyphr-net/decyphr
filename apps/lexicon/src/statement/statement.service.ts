import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import { Word } from 'src/bank/bank.entity';
import {
  NlpCompleteEvent,
  PreparedToken,
} from 'src/lexicon/ingest/lexicon.ingest.types';
import { Statement, StatementToken } from './statement.entity';
import { CreateStatementInput } from './statement.types';

@Injectable()
export class StatementService implements OnModuleInit {
  private readonly logger = new Logger(StatementService.name);

  constructor(
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(StatementToken)
    private readonly tokenRepository: Repository<StatementToken>,
    @Inject('STATEMENT_PRODUCER') private readonly kafkaProducer: ClientKafka,
  ) { }

  async onModuleInit() {
    await this.kafkaProducer.connect();
  }

  /**
   * Creates or retrieves a statement derived from an ingestion event.
   * Statements are deduplicated using a stable fingerprint.
   *
   * @param input Statement creation payload
   * @returns Persisted Statement entity
   */
  async getOrCreate(input: CreateStatementInput): Promise<Statement> {
    const normalized = this.normalize(input.text);
    const fingerprint = this.fingerprint(input.language, normalized);

    let statement = await this.statementRepository.findOne({
      where: { fingerprint },
    });

    if (statement) {
      if (!statement.requestId && input.requestId) {
        statement.requestId = input.requestId;
        await this.statementRepository.save(statement);
      }
      return statement;
    }

    statement = this.statementRepository.create({
      text: input.text,
      meaning: input.meaning ?? null,
      language: input.language,
      source: input.source,
      clientId: input.clientId,
      fingerprint,
      createdAt: input.timestamp ?? new Date(),
      requestId: input.requestId,
    });

    this.logger.debug(
      `Creating statement fingerprint=${fingerprint} clientId=${input.clientId}`,
    );

    return this.statementRepository.save(statement);
  }

  /**
   * Normalizes statement text for stable deduplication.
   *
   * @param text Raw surface text
   * @returns Normalized string
   */
  private normalize(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Produces a stable fingerprint for a statement.
   *
   * @param language Statement language
   * @param normalizedText Normalized text
   * @returns SHA256 fingerprint
   */
  private fingerprint(language: string, normalizedText: string): string {
    return createHash('sha256')
      .update(`${language}:${normalizedText}`)
      .digest('hex');
  }

  /**
   * Persist statements + tokens for a NLP event
   *
   * @param event NLP completion event
   * @param words Map of resolved Word entities keyed by `${lemma}:${pos}`
   */
  async persistFromEvent(
    event: NlpCompleteEvent,
    words: Map<string, Word>,
  ): Promise<void> {
    for (const sentence of event.sentences) {
      const statement = await this.getOrCreate({
        text: sentence.text,
        language: event.language,
        clientId: event.clientId,
        source: event.interaction?.type ?? 'nlp',
        meaning: event.meaning ?? null,
        timestamp: new Date(),
      });

      await this.createTokens(statement, sentence.tokens, words);
    }
  }

  /**
   * Persist StatementTokens linking a statement to the Words it contains
   *
   * @param statement Statement entity
   * @param tokens Prepared tokens from NLP
   * @param words Map of resolved Word entities keyed by `${lemma}:${pos}`
   */
  async createTokens(
    statement: Statement,
    tokens: PreparedToken[],
    words: Map<string, Word>,
  ): Promise<void> {
    const values = tokens.map((t, i) => {
      const word =
        t.lemma != null ? words.get(`${t.lemma}:${t.pos}`) : undefined;

      return this.tokenRepository.create({
        statement,
        word: word ?? null,
        position: i,
        surface: t.surface,
        lemma: t.lemma ?? null,
        pos: t.pos,
      });
    });

    if (!values.length) return;

    await this.tokenRepository.save(values);

    this.logger.debug(
      `Saved ${values.length} tokens for statementId=${statement.id}`,
    );
  }

  async getUserStatements(clientId: string, language: string) {
    const statements = await this.statementRepository.find({
      where: {
        clientId,
        language,
      },
      relations: {
        tokens: true,
      },
      order: {
        createdAt: 'DESC',
        tokens: {
          position: 'ASC',
        },
      },
    });

    return statements.map((statement) => ({
      id: statement.id,
      text: statement.text,
      language: statement.language,

      pronunciation: statement.pronunciation ?? null,
      translation: statement.translation ?? statement.meaning ?? null,
      translationLanguage: statement.translationLanguage ?? null,

      example: statement.example ?? null,
      notes: statement.notes ?? null,

      tokens: statement.tokens.map((token) => ({
        position: token.position,
        surface: token.surface,
        lemma: token.lemma,
        pos: token.pos,
      })),
    }));
  }

  async deleteStatementById(id: number): Promise<void> {
    await this.statementRepository.delete({ id });
  }

  findById(
    id: number,
    options?: { relations?: string[] },
  ): Promise<Statement | undefined> {
    return this.statementRepository.findOne({
      where: { id },
      relations: options?.relations,
    });
  }

  async save(statement: Statement): Promise<Statement> {
    return this.statementRepository.save(statement);
  }

  async clearTokens(statementId: number): Promise<void> {
    await this.tokenRepository.delete({ statement: { id: statementId } });
  }

  async updateTranslation(event: any) {
    const { statementId, requestId, translated } = event;
    if (!translated) throw new Error('No translation provided');

    let statement: Statement;

    if (statementId) {
      statement = await this.statementRepository.findOne({
        where: { id: statementId },
        relations: ['tokens'],
      });
    } else if (requestId) {
      statement = await this.statementRepository.findOne({
        where: { requestId },
        relations: ['tokens'],
      });
    } else {
      throw new Error('No statementId or requestId provided');
    }

    if (!statement) {
      this.logger.warn(
        `Translation received but statement not found (statementId=${statementId}, requestId=${requestId})`,
      );
      return;
    }
    statement.meaning = translated;
    await this.statementRepository.save(statement);

    this.logger.debug(
      'TOKENS BEFORE EMIT',
      JSON.stringify(statement.tokens, null, 2),
    );

    await lastValueFrom(
      this.kafkaProducer.emit('statement.updated', {
        value: JSON.stringify({
          id: statement.id,
          requestId: statement.requestId,
          text: statement.text,
          meaning: statement.meaning,
          tokens: statement.tokens.map((token) => ({
            id: token.id,
            position: token.position,
            surface: token.surface,
            lemma: token.lemma,
            pos: token.pos,
          })),
        }),
      }),
    );
  }
}
