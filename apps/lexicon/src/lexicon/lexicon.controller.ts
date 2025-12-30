import { Controller, Get, Logger, Param } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { User, Word } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';
import { Repository } from 'typeorm';
import { LexiconIngestService } from './lexicon.ingest.service';

export type NlpCompleteEvent = {
  requestId?: string;
  clientId: string;
  sourceLanguage?: string;
  timestamp?: string;
  sentences: {
    sentenceId: string;
    text: string;
    tokens: {
      surface: string;
      lemma: string;
      pos: string;
      normalised: string;
      morph?: Record<string, any>;
    }[];
  }[];
};

@Controller()
export class LexiconController {
  private readonly logger = new Logger(LexiconController.name);

  constructor(
    private readonly ingestService: LexiconIngestService,
    @InjectRepository(Word) private readonly wordsRepo: Repository<Word>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) { }

  @EventPattern('nlp.complete')
  async handleWordEncounter(@Payload() message: any, @Ctx() context: KafkaContext) {
    const originalMsg = message?.value ?? message;
    let event: any;
    try {
      event = typeof originalMsg === 'string' ? JSON.parse(originalMsg) : originalMsg;
    } catch (err) {
      this.logger.error('Malformed Kafka message', err as any);
      return;
    }

    const eventId = event.eventId ?? event.id;
    try {
      await this.ingestService.ingestFromEvent(event);
      this.logger.debug(`Processed event ${eventId ?? '(no-id)'}`);
    } catch (err) {
      this.logger.error(`Error processing event ${eventId ?? '(no-id)'}: ${err}`, err as any);
    }
  }

  async getDistinctWordsWithStats(clientId: string, language: string) {
    // 1️⃣ Resolve user ID
    let user = await this.userRepo.findOne({ where: { clientId } });

    if (!user) {
      // auto-create user
      user = await this.userRepo.save(
        this.userRepo.create({ clientId })
      );
    }

    // 2️⃣ Query stats with words
    const rows = await this.wordsRepo
      .createQueryBuilder('w')
      .innerJoin(
        UserWordStatistics,
        'uws',
        'uws.wordId = w.id AND uws.userId = :uid',
        { uid: user.id },
      )
      .where('w.language = :lang', { lang: language })
      .select([
        'w.id AS w_id',
        'w.word AS w_word',
        'w.normalised AS w_normalised',
        'w.tag AS w_tag',
        'w.language AS w_language',
        'w.lemma AS w_lemma',

        'uws.weighted7Days AS weighted7d',
        'uws.weighted30Days AS weighted30d',
        'uws.totalInteractions7Days AS total7d',
        'uws.totalInteractions30Days AS total30d',
        'uws.score AS score',
      ])
      .getRawMany();

    // 3️⃣ Build output
    return rows.map(r => {
      const total =
        Number(r.total7d || 0) +
        Number(r.total30d || 0);

      const weighted =
        Number(r.weighted7d || 0) +
        Number(r.weighted30d || 0);

      return {
        id: r.w_id,
        word: r.w_word,
        normalised: r.w_normalised,
        tag: r.w_tag,
        language: r.w_language,
        lemma: r.w_lemma,
        stats: {
          total,
          weighted,
          total7d: Number(r.total7d) || 0,
          total30d: Number(r.total30d) || 0,
          weighted7d: Number(r.weighted7d) || 0,
          weighted30d: Number(r.weighted30d) || 0,
          score: Number(r.score) || 0,
        },
      };
    });
  }


  @Get('snapshot/:clientId/:language')
  async getSnapshot(@Param('clientId') clientId: string, @Param('language') language: string) {
    return this.getDistinctWordsWithStats(clientId, language);
  }
}
