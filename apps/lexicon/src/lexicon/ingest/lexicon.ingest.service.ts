import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, In, Repository } from 'typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { RedisProfileService } from '../profile.service';
import { INTERACTION_WEIGHTS, POS_MULTIPLIERS } from './lexicon.ingest.contants';
import { InteractionMetadata, NlpCompleteEvent, PreparedToken } from './lexicon.ingest.types';

@Injectable()
export class LexiconIngestService {
  private readonly logger = new Logger(LexiconIngestService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Word) private readonly wordRepository: Repository<Word>,
    private readonly profile: RedisProfileService,
    private readonly interactionService: InteractionService,
  ) { }

  async ingestFromEvent(event: NlpCompleteEvent) {
    const user = await this.getOrCreateUser(event.clientId);

    const tokens = this.prepareTokens(event.sentences);
    const words = await this.syncWords(tokens, event.language);

    await this.applyIngestionEffects(
      user.clientId,
      words,
      event.language,
      event.interaction,
    );

    this.logger.debug(`Ingested ${words.size} words for ${user.clientId}`);
  }

  // ---------- token prep ----------
  private prepareTokens(sentences: NlpCompleteEvent['sentences']) {
    const map = new Map<string, PreparedToken>();

    for (const token of sentences.flatMap(s => s.tokens)) {
      // skip punctuation, numerals, symbols
      if (['punctuation', 'numeral', 'symbol'].includes(token.pos)) {
        continue;
      }

      if (!map.has(token.lemma)) {
        map.set(token.lemma, token);
      }
    }

    return [...map.values()];
  }

  // ---------- persistence ----------
  private async syncWords(tokens: PreparedToken[], language: string) {
    const lemmas = tokens.map(t => t.lemma.slice(0, 50));

    const existing = await this.wordRepository.find({
      where: { lemma: In(lemmas), language },
    });

    const resolved = new Map<string, Word>(
      existing.map(w => [w.lemma, w]),
    );

    const missing = tokens.filter(t => !resolved.has(t.lemma.slice(0, 50)));

    if (missing.length) {
      await this.insertMissingWords(missing, language);
      const reloaded = await this.wordRepository.find({
        where: { lemma: In(missing.map(m => m.lemma.slice(0, 50))), language },
      });
      reloaded.forEach(w => resolved.set(w.lemma, w));
    }

    return resolved;
  }

  private async insertMissingWords(tokens: PreparedToken[], language: string) {
    const seen = new Set<string>();

    const values = tokens
      .map(t => ({
        word: t.surface,
        lemma: t.lemma.slice(0, 50),
        normalised: t.normalised,
        tag: t.pos,
        language,
      }))
      .filter(v => {
        const key = `${v.normalised}-${language}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (!values.length) return;

    await this.connection
      .createQueryBuilder()
      .insert()
      .into(Word)
      .values(values)
      .orIgnore()
      .execute();
  }

  // ---------- side effects ----------
  private async applyIngestionEffects(
    clientId: string,
    words: Map<string, Word>,
    language: string,
    interaction?: InteractionMetadata,
  ) {
    await Promise.all(
      [...words.values()].map(async word => {
        await this.profile.setWord(word.id, word.word);

        this.logger.debug(`Calculating score for ${word.word}`)

        const weight = this.computeWeight(word.tag, interaction?.type);
        this.logger.debug(`Weight: ${weight}`)
        await this.profile.addOrUpdateUserWordScore(
          clientId,
          language,
          word.id,
          weight,
        );

        if (interaction?.type) {
          await this.interactionService.createInteraction(
            clientId,
            word.id,
            interaction.type,
          );
        }
      }),
    );
  }

  // ---------- scoring ----------
  private computeWeight(pos: string, interaction?: string) {
    return this.baseWeight(interaction) * this.posMultiplier(pos);
  }

  private baseWeight(type?: string) {
    return INTERACTION_WEIGHTS[type ?? 'default'];
  }

  private posMultiplier(tag: string) {
    return POS_MULTIPLIERS[tag] ?? POS_MULTIPLIERS.DEFAULT;
  }

  // ---------- user ----------
  private async getOrCreateUser(clientId: string) {
    return (
      (await this.userRepository.findOne({ where: { clientId } })) ??
      this.userRepository.save(this.userRepository.create({ clientId }))
    );
  }
}
