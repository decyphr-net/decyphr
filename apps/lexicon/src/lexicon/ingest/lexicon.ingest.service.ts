import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';

import { User, Word, WordForm } from 'src/bank/bank.entity';
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
    @InjectRepository(WordForm) private readonly wordFormRepository: Repository<WordForm>,
    private readonly profile: RedisProfileService,
    private readonly interactionService: InteractionService,
  ) { }

  async ingestFromEvent(event: NlpCompleteEvent) {
    const user = await this.getOrCreateUser(event.clientId);

    const tokens = this.prepareTokens(event.sentences);
    const words = await this.syncWords(tokens, event.language);
    const wordForms = await this.syncWordForms(tokens, words);

    await this.applyIngestionEffects(
      user.clientId,
      wordForms,
      event.language,
      event.interaction,
    );

    this.logger.debug(`Ingested ${wordForms.length} word forms for ${user.clientId}`);
  }

  // ---------- token prep ----------
  private prepareTokens(sentences: NlpCompleteEvent['sentences']) {
    return sentences
      .flatMap(s => s.tokens)
      .filter(t => !['punctuation', 'numeral', 'symbol'].includes(t.pos));
  }

  // ---------- lexeme persistence ----------
  private async syncWords(tokens: PreparedToken[], language: string) {
    const keys = tokens.map(t => ({
      word: t.surface,
      lemma: t.lemma.slice(0, 50),
      pos: t.pos,
      language,
    }));

    const existing = await this.wordRepository.find({ where: keys });

    const resolved = new Map<string, Word>();
    existing.forEach(w => {
      resolved.set(`${w.lemma}:${w.pos}`, w);
    });

    const missing = keys.filter(
      k => !resolved.has(`${k.lemma}:${k.pos}`),
    );

    if (missing.length) {
      await this.connection
        .createQueryBuilder()
        .insert()
        .into(Word)
        .values(missing)
        .orIgnore()
        .execute();

      const reloaded = await this.wordRepository.find({ where: missing });
      reloaded.forEach(w => {
        resolved.set(`${w.lemma}:${w.pos}`, w);
      });
    }

    return resolved;
  }

  // ---------- form persistence ----------
  private async syncWordForms(
    tokens: PreparedToken[],
    words: Map<string, Word>,
  ) {
    // Build insertable values, skipping tokens that don't have a corresponding Word
    const values = tokens
      .map(t => {
        const word = words.get(`${t.lemma}:${t.pos}`);
        if (!word) return null; // skip if Word not found
        return { wordId: word.id, form: t.surface };
      })
      .filter(Boolean) as { wordId: number; form: string }[];

    if (!values.length) return [];

    // Insert WordForm rows using the foreign key (wordId)
    await this.connection
      .createQueryBuilder()
      .insert()
      .into(WordForm)
      .values(values)
      .orIgnore() // ignore duplicates
      .execute();

    // Fetch the inserted/found WordForms with their relations
    return this.wordFormRepository.find({
      relations: ['word'],
      where: values.map(v => ({
        word: { id: v.wordId },
        form: v.form,
      })),
    });
  }

  // ---------- side effects ----------
  private async applyIngestionEffects(
    clientId: string,
    wordForms: WordForm[],
    language: string,
    interaction?: InteractionMetadata,
  ) {
    await Promise.all(
      wordForms.map(async wf => {
        const word = wf.word;

        await this.profile.setWord(word.id, word.lemma);

        const weight = this.computeWeight(word.pos, interaction?.type);

        await this.profile.addOrUpdateUserWordScore(
          clientId,
          language,
          word.id,
          weight,
        );

        await this.profile.markWordSeen(
          clientId,
          language,
          word.id,
        );

        if (interaction?.type) {
          await this.interactionService.createInteraction(
            clientId,
            wf.word.id,
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

  private posMultiplier(pos: string) {
    return POS_MULTIPLIERS[pos] ?? POS_MULTIPLIERS.DEFAULT;
  }

  // ---------- user ----------
  private async getOrCreateUser(clientId: string) {
    return (
      (await this.userRepository.findOne({ where: { clientId } })) ??
      this.userRepository.save(this.userRepository.create({ clientId }))
    );
  }
}
