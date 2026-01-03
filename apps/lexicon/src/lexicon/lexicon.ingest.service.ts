import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { User, Word } from 'src/bank/bank.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { Connection, In, Repository } from 'typeorm';
import { RedisProfileService } from './profile.service';

export type InteractionMetadata = {
  type: string;
  timestamp?: string;
};

export type NlpCompleteEvent = {
  requestId?: string;
  clientId: string;
  language?: string;
  timestamp?: string;
  interaction?: InteractionMetadata;
  sentences: {
    sentenceId: string;
    text: string;
    tokens: {
      surface: string;
      normalised: string;
      lemma: string;
      pos: string;
      morph?: Record<string, any>;
    }[];
  }[];
};

@Injectable()
export class LexiconIngestService {
  private readonly logger = new Logger(LexiconIngestService.name);

  private readonly INTERACTION_WEIGHTS: Record<string, number> = {
    lexicon_import: 0.25,
    translate_text: 0.4,
    chat_message: 0.6,
    chat_message_bot: 0.3,
    passive_read: 0.1,
    default: 0.3,
  };

  private readonly POS_MULTIPLIER: Record<string, number> = {
    CCONJ: 0.1,
    PART: 0.1,
    DET: 0.15,
    PRON: 0.2,
    AUX: 0.2,
    NOUN: 1.0,
    VERB: 1.0,
    ADJ: 1.0,
    ADV: 1.0,
    DEFAULT: 1.0,
  };

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Word) private readonly wordRepository: Repository<Word>,
    private readonly profile: RedisProfileService,
    private readonly interactionService: InteractionService,
  ) { }

  private getBaseWeight(type?: string): number {
    if (!type) return this.INTERACTION_WEIGHTS.passive_read;
    return this.INTERACTION_WEIGHTS[type] ?? this.INTERACTION_WEIGHTS.default;
  }

  private getPosMultiplier(tag?: string): number {
    if (!tag) return this.POS_MULTIPLIER.DEFAULT;
    return this.POS_MULTIPLIER[tag.toUpperCase()] ?? this.POS_MULTIPLIER.DEFAULT;
  }

  async getOrCreateUser(clientId: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { clientId } });

    if (!user) {
      user = await this.userRepository.save(
        this.userRepository.create({ clientId }),
      );
      this.logger.log(`Created new user for clientId=${clientId}`);
    }

    return user;
  }

  async ingestFromEvent(event: NlpCompleteEvent) {
    if (!event.clientId) throw new Error('Event missing clientId');
    if (!event.sentences?.length) return;

    const language = event.language ?? 'und';
    const tokens = event.sentences.flatMap(s => s.tokens || []);
    if (tokens.length === 0) return;

    const prepared = tokens.map(t => ({
      surface: t.surface,
      lemma: t.lemma ?? t.surface,
      normalised: t.normalised ?? (t.lemma ?? t.surface).toLowerCase(),
      pos: t.pos ?? ''
    }));

    //
    // 1️⃣ Deduplicate by lemma (your original logic)
    //
    const lemmaMap = new Map<string, typeof prepared[number]>();
    for (const t of prepared) {
      if (!lemmaMap.has(t.lemma)) lemmaMap.set(t.lemma, t);
    }
    const unique = [...lemmaMap.values()];

    const user = await this.getOrCreateUser(event.clientId);

    //
    // 2️⃣ Load existing DB words
    //
    const lemmas = unique.map(u => u.lemma.slice(0, 50));
    const existing = await this.wordRepository.find({
      where: { lemma: In(lemmas), language },
    });

    const resolved = new Map<string, Word>();
    for (const w of existing) resolved.set(w.lemma, w);

    //
    // 3️⃣ Determine missing words
    //
    const missing = unique.filter(
      u => !resolved.has(u.lemma.slice(0, 50)),
    );

    //
    // 4️⃣ Deduplicate missing inserts by (normalised + language)
    //
    const seen = new Set<string>();
    const toInsert = missing
      .map(m => ({
        word: m.surface,
        normalised: m.normalised,
        language,
        lemma: m.lemma.slice(0, 50),
        tag: m.pos,
      }))
      .filter(entry => {
        const key = `${entry.normalised}-${entry.language}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    //
    // 5️⃣ Insert using `orIgnore()` so duplicates NEVER throw
    //
    if (toInsert.length > 0) {
      await this.connection
        .createQueryBuilder()
        .insert()
        .into(Word)
        .values(toInsert)
        .orIgnore()                 // <—— prevents ER_DUP_ENTRY
        .execute();

      // Reload inserted words so resolved[] is complete
      const reloaded = await this.wordRepository.find({
        where: {
          lemma: In(missing.map(m => m.lemma.slice(0, 50))),
          language,
        },
      });

      for (const w of reloaded) resolved.set(w.lemma, w);
    }

    //
    // 6️⃣ Redis Integration (safe)
    //
    for (const u of unique) {
      const word = resolved.get(u.lemma.slice(0, 50));
      if (!word) continue;

      await this.profile.setWord(word.id, word.word);

      const base = this.getBaseWeight(event.interaction?.type);
      const posMult = this.getPosMultiplier(word.tag);
      const weight = base * posMult;

      await this.profile.addOrUpdateUserWordScore(
        user.clientId,
        language,
        word.id,
        weight,
      );

      if (event.interaction?.type) {
        try {
          await this.interactionService.createInteraction(
            user.clientId,
            word.id,
            event.interaction.type,
          );
        } catch (err) {
          this.logger.error(
            `Failed to create interaction for word ${word.lemma}: ${err.message}`,
          );
        }
      }
    }

    this.logger.debug(
      `Processed ${unique.length} unique words for user ${user.clientId}`,
    );
  }
}
