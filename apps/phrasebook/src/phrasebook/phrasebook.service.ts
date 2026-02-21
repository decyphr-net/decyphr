import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';

import {
  TranslationDto,
  TranslationProducer,
  StatementEventProducer,
  KafkaTopics,
  PhrasebookTokensDto,
} from '@decyphr/messaging';

import { UpdatePhraseDto, PhrasebookStatementDto } from './phrasebook.dto';
import { Phrase } from './phrasebook.entity';
import { PhraseToken } from './phrasebook.entity';

@Injectable()
export class PhrasebookService {
  constructor(
    @InjectRepository(Phrase)
    private readonly phraseRepo: Repository<Phrase>,
    @InjectRepository(PhraseToken)
    private readonly tokenRepo: Repository<PhraseToken>,
  private readonly translationProducer: TranslationProducer,
  private readonly statementEventProducer: StatementEventProducer,
) {}

  private readonly logger = new Logger(PhrasebookService.name);

  private async emitTranslationRequest(params: {
    clientId: string;
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
    statementId: number;
    requestId?: string;
  }) {
    const message: TranslationDto = {
      requestId: params.requestId ?? randomUUID(),
      clientId: params.clientId,
      text: params.text,
      sourceLanguage: params.sourceLanguage,
      targetLanguage: params.targetLanguage,
      statementId: params.statementId,
      interaction: {
        type: 'phrasebook.auto-translation',
        timestamp: Date.now(),
      },
    };

    await this.translationProducer.requestTranslation(message);
  }

  async getPhrasebook(clientId: string): Promise<PhrasebookStatementDto[]> {
    const phrases = await this.phraseRepo.find({
      where: { clientId },
      relations: ['tokens'],
      order: { tokens: { position: 'ASC' } },
    });

    return phrases.map((p) => this.toDto(p));
  }

  async getPhrase(id: number): Promise<PhrasebookStatementDto> {
    const phrase = await this.phraseRepo.findOne({
      where: { id },
      relations: ['tokens'],
      order: { tokens: { position: 'ASC' } },
    });

    if (!phrase) throw new NotFoundException(`Phrase ${id} not found`);
    return this.toDto(phrase);
  }

  async createPhrase(
    clientId: string,
    dto: UpdatePhraseDto,
  ): Promise<PhrasebookStatementDto> {
    const fingerprint = createHash('sha256').update(dto.text).digest('hex');

    const phrase = this.phraseRepo.create({
      clientId,
      fingerprint,
      createdAt: new Date(),
      ...dto,
    });
    const saved = await this.phraseRepo.save(phrase);

    if (dto.tokens?.length) {
      const tokens = dto.tokens.map((t) =>
        this.tokenRepo.create({
          ...t,
          word: t.lemma ?? t.surface,
          phrase: saved,
        }),
      );
      await this.tokenRepo.save(tokens);
    }

    const shouldAutoTranslate = Boolean(dto.autoTranslation);

    await this.emitStatementEvent('statement_created', saved, dto);

    if (shouldAutoTranslate && !saved.translation) {
      const translationClientId = saved.clientId || clientId;
      await this.translationProducer.requestTranslation({
        requestId: randomUUID(),
        clientId: translationClientId,
        text: saved.text,
        sourceLanguage: saved.language,
        targetLanguage: 'en',
        statementId: saved.id,
        interaction: {
          type: 'phrasebook.auto-translation',
          timestamp: Date.now(),
        },
      });
    }

    return this.getPhrase(saved.id);
  }

  async updatePhrase(
    id: number,
    dto: UpdatePhraseDto,
  ): Promise<PhrasebookStatementDto> {
    const phrase = await this.phraseRepo.findOne({
      where: { id },
      relations: ['tokens'],
    });
    if (!phrase) throw new NotFoundException(`Phrase ${id} not found`);

    Object.assign(phrase, dto);
    await this.phraseRepo.save(phrase);

    await this.emitStatementEvent('statement_updated', phrase, dto);

    if (dto.tokens) {
      // Delete old tokens
      await this.tokenRepo.delete({ phrase: { id } });
      // Save new tokens
      const tokens = dto.tokens.map((t) =>
        this.tokenRepo.create({
          ...t,
          word: t.lemma ?? t.surface,
          phrase,
        }),
      );
      await this.tokenRepo.save(tokens);
    }

    return this.getPhrase(id);
  }

  async deletePhrase(id: number): Promise<{ success: boolean }> {
    const res = await this.phraseRepo.delete(id);
    return { success: res.affected > 0 };
  }

  async generateTranslation(
    id: number,
    clientId: string,
  ): Promise<PhrasebookStatementDto> {
    const where = clientId ? { id, clientId } : { id };
    const phrase = await this.phraseRepo.findOne({ where });
    if (!phrase) throw new NotFoundException(`Phrase ${id} not found`);

    const requestId = randomUUID();
    phrase.requestId = requestId;
    await this.phraseRepo.save(phrase);

    const effectiveClientId = clientId || phrase.clientId;

    await this.emitTranslationRequest({
      requestId,
      clientId: effectiveClientId,
      text: phrase.text,
      sourceLanguage: phrase.language,
      targetLanguage: 'en',
      statementId: phrase.id,
    });

    return this.getPhrase(id);
  }

  private async emitStatementEvent(
    type: 'statement_created' | 'statement_updated',
    phrase: Phrase,
    dto: UpdatePhraseDto,
  ) {
    const requestId = phrase.requestId ?? randomUUID();
    phrase.requestId = requestId;
    await this.phraseRepo.save(phrase);

    await this.statementEventProducer.emitStatementEvent({
      requestId,
      statementId: phrase.id.toString(),
      clientId: phrase.clientId,
      changes: {
        text: dto.text,
        translation: dto.translation,
        pronunciation: dto.pronunciation,
        notes: dto.notes,
      },
      interaction: {
        type: `phrasebook.${type}`,
        timestamp: Date.now(),
      },
      type,
      autoTranslate: !!dto.autoTranslation,
      timestamp: Date.now(),
      language: phrase.language,
    });
  }

  async handlePhrasebookTokens(payload: PhrasebookTokensDto) {
    const phrase = payload.statementId
      ? await this.phraseRepo.findOne({ where: { id: payload.statementId } })
      : payload.requestId
        ? await this.phraseRepo.findOne({
            where: { requestId: payload.requestId },
          })
        : null;

    if (!phrase) {
      this.logger.warn(
        `Phrase not found for tokens event (statementId=${payload.statementId}, requestId=${payload.requestId})`,
      );
      return;
    }

    await this.tokenRepo.delete({ phrase: { id: phrase.id } });
    const tokens = payload.tokens.map((token) =>
      this.tokenRepo.create({
        ...token,
        word: token.lemma ?? token.surface,
        phrase,
      }),
    );
    await this.tokenRepo.save(tokens);
  }

  async handleTranslationComplete(payload: {
    requestId?: string;
    statementId?: string | number;
    targetLanguage?: string;
    translated?: string;
  }) {
    const statementId =
      typeof payload.statementId === 'string'
        ? Number.parseInt(payload.statementId, 10)
        : payload.statementId;

    const phrase =
      typeof statementId === 'number' && Number.isFinite(statementId)
        ? await this.phraseRepo.findOne({ where: { id: statementId } })
        : payload.requestId
          ? await this.phraseRepo.findOne({
              where: { requestId: payload.requestId },
            })
          : null;

    if (!phrase) {
      this.logger.warn(
        `Phrase not found for translation.complete (statementId=${payload.statementId}, requestId=${payload.requestId})`,
      );
      return;
    }

    phrase.translation = payload.translated ?? phrase.translation;
    phrase.translationLanguage = payload.targetLanguage ?? phrase.translationLanguage;
    await this.phraseRepo.save(phrase);
  }

  private toDto(p: Phrase): PhrasebookStatementDto {
    return {
      id: p.id,
      text: p.text,
      translation: p.translation,
      pronunciation: p.pronunciation,
      example: p.example,
      notes: p.notes,
      tokens: p.tokens?.map((t) => ({
        position: t.position,
        surface: t.surface,
        lemma: t.lemma,
        pos: t.pos,
      })),
    };
  }
}
