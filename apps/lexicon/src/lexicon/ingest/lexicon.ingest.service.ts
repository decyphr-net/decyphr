import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';

import { User, Word, WordForm } from 'src/bank/bank.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { Statement } from 'src/statement/statement.entity';
import { StatementService } from 'src/statement/statement.service';
import { RedisProfileService } from '../profile.service';
import {
  INTERACTION_WEIGHTS,
  POS_MULTIPLIERS,
} from './lexicon.ingest.contants';
import {
  InteractionMetadata,
  NlpCompleteEvent,
  PreparedToken,
} from './lexicon.ingest.types';

/**
 * Service responsible for ingesting NLP-completed text into the lexicon.
 *
 * Responsibilities:
 * - Normalize and filter NLP tokens
 * - Ensure Word and WordForm records exist
 * - Apply side effects (profile updates, scoring, interactions)
 *
 * This service is deliberately stateless and driven entirely by events.
 */
@Injectable()
export class LexiconIngestService {
  private readonly logger = new Logger(LexiconIngestService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Word) private readonly wordRepository: Repository<Word>,
    @InjectRepository(WordForm)
    private readonly wordFormRepository: Repository<WordForm>,
    private readonly profile: RedisProfileService,
    private readonly interactionService: InteractionService,
    private readonly statementService: StatementService,
  ) { }

  /**
   * Entry point for lexicon ingestion.
   *
   * Given an NLP completion event, this method:
   * - resolves the user
   * - extracts and normalizes tokens
   * - syncs words and word forms
   * - applies all downstream side effects
   *
   * @param {NlpCompleteEvent} event
   *  NLP completion event containing tokenized sentences
   *  and optional interaction metadata.
   *
   * @returns {Promise<void>}
   *  Resolves when ingestion and all side effects complete.
   */
  async ingestFromEvent(event: NlpCompleteEvent): Promise<void> {
    this.logger.debug(
      `Starting lexicon ingestion for clientId=${event.clientId}`,
    );
    const user = await this.getOrCreateUser(event.clientId);

    // ---------------------------------------------------------------------------
    // Prepare tokens and persist words/forms
    // ---------------------------------------------------------------------------
    const tokens = this.prepareTokens(event.sentences);
    this.logger.debug(`Prepared ${tokens.length} candidate tokens`);

    const words = await this.syncWords(tokens, event.language);
    this.logger.debug(`Resolved ${words.size} unique words`);

    const wordForms = await this.syncWordForms(tokens, words);
    this.logger.debug(`Resolved ${wordForms.length} word forms`);

    // ---------------------------------------------------------------------------
    // Persist statements for each sentence
    // ---------------------------------------------------------------------------
    const statementMap = new Map<string, Statement>();
    for (const sentence of event.sentences) {
      const statement = await this.statementService.getOrCreate({
        text: sentence.text,
        language: event.language,
        clientId: event.clientId,
        source: event.interaction?.type ?? 'nlp',
        meaning: event.meaning ?? null,
        timestamp: new Date(),
      });
      statementMap.set(sentence.text, statement);
    }

    // 5. Link tokens to statements
    for (const sentence of event.sentences) {
      const statement = statementMap.get(sentence.text);
      if (!statement) continue;

      await this.statementService.createTokens(
        statement,
        sentence.tokens, // include all tokens
        words, // Word optional
      );
    }

    console.log(
      'WordForms ready:',
      wordForms.map((wf) => ({ id: wf.id, form: wf.form, wordId: wf.word.id })),
    );

    // ---------------------------------------------------------------------------
    // Apply profile / scoring / interaction side effects
    // ---------------------------------------------------------------------------
    await this.applyIngestionEffects(
      user.clientId,
      wordForms,
      event.language,
      event.interaction,
    );

    this.logger.debug(
      `Lexicon ingestion complete for clientId=${user.clientId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Token preparation
  // ---------------------------------------------------------------------------

  /**
   * Flattens sentences into tokens and removes tokens
   * that should never be ingested (punctuation, numerals, symbols).
   * @param {NlpCompleteEvent['sentences']} sentences
   *  Sentences produced by the NLP pipeline.
   *
   * @returns {PreparedToken[]}
   *  Normalized tokens eligible for lexicon ingestion.
   */
  private prepareTokens(
    sentences: NlpCompleteEvent['sentences'],
  ): PreparedToken[] {
    return sentences
      .flatMap((s) => s.tokens)
      .filter((t) => !['punctuation', 'numeral', 'symbol'].includes(t.pos));
  }

  // ---------------------------------------------------------------------------
  // Word persistence
  // ---------------------------------------------------------------------------

  /**
   * Ensures all lexical words referenced by the token stream exist.
   *
   * Words are uniquely identified by (lemma, pos, language).
   * Missing entries are inserted using bulk operations.
   *
   * @param {PreparedToken[]} tokens
   *  Normalized tokens extracted from NLP output.
   *
   * @param {string} language
   *  ISO language code associated with the tokens.
   *
   * @returns {Promise<Map<string, Word>>}
   *  Map of resolved Word entities keyed by `${lemma}:${pos}`.
   */
  private async syncWords(
    tokens: PreparedToken[],
    language: string,
  ): Promise<Map<string, Word>> {
    const keys = tokens.map((t) => ({
      word: t.surface,
      lemma: (t.lemma ?? t.surface).slice(0, 50),
      pos: t.pos,
      language,
    }));

    const existing = await this.wordRepository.find({ where: keys });

    const resolved = new Map<string, Word>();
    existing.forEach((w) => {
      resolved.set(`${w.lemma}:${w.pos}`, w);
    });

    const missing = keys.filter((k) => !resolved.has(`${k.lemma}:${k.pos}`));

    if (missing.length) {
      await this.connection
        .createQueryBuilder()
        .insert()
        .into(Word)
        .values(missing)
        .orIgnore()
        .execute();

      const reloaded = await this.wordRepository.find({ where: missing });
      reloaded.forEach((w) => {
        resolved.set(`${w.lemma}:${w.pos}`, w);
      });
    }

    return resolved;
  }

  // ---------------------------------------------------------------------------
  // WordForm persistence
  // ---------------------------------------------------------------------------

  /**
   * Ensures WordForm entries exist for each observed surface form.
   *
   * Tokens that cannot be associated with a Word entity
   * are skipped defensively.
   *
   * @param {PreparedToken[]} tokens
   *  Normalized NLP tokens.
   *
   * @param {Map<string, Word>} words
   *  Resolved Word entities keyed by `${lemma}:${pos}`.
   *
   * @returns {Promise<WordForm[]>}
   *  Array of WordForm entities with Word relations loaded.
   */
  private async syncWordForms(
    tokens: PreparedToken[],
    words: Map<string, Word>,
  ): Promise<WordForm[]> {
    const values = tokens
      .map((t) => {
        const word = words.get(`${t.lemma}:${t.pos}`);
        if (!word) return null;

        return {
          word,
          form: t.surface,
        };
      })
      .filter(Boolean) as Partial<WordForm>[];

    if (!values.length) return [];

    await this.wordFormRepository
      .createQueryBuilder()
      .insert()
      .into(WordForm)
      .values(values)
      .orIgnore()
      .execute();

    return this.wordFormRepository.find({
      relations: ['word'],
      where: values.map((v) => ({
        word: { id: v.word!.id },
        form: v.form!,
      })),
    });
  }

  // ---------------------------------------------------------------------------
  // Side effects
  // ---------------------------------------------------------------------------

  /**
   * Applies all non-persistence side effects for ingested words.
   *
   * Side effects include:
   * - updating Redis lexicon data
   * - updating per-user word scores
   * - marking words as seen
   * - recording interaction events
   *
   * @param {string} clientId
   *  Unique identifier for the user.
   *
   * @param {WordForm[]} wordForms
   *  WordForm entities to apply effects for.
   *
   * @param {string} language
   *  Language code associated with the ingestion.
   *
   * @param {InteractionMetadata | undefined} interaction
   *  Optional interaction metadata driving scoring and logging.
   *
   * @returns {Promise<void>}
   */
  private async applyIngestionEffects(
    clientId: string,
    wordForms: WordForm[],
    language: string,
    interaction?: InteractionMetadata,
  ): Promise<void> {
    await Promise.all(
      wordForms.map(async (wf) => {
        const word = wf.word;

        await this.profile.setWord(word.id, word.lemma);

        const weight = this.computeWeight(word.pos, interaction?.type);

        await this.profile.addOrUpdateUserWordScore(
          clientId,
          language,
          word.id,
          weight,
        );

        await this.profile.markWordSeen(clientId, language, word.id);

        if (interaction?.type) {
          await this.interactionService.createInteraction(
            clientId,
            wf.id,
            interaction.type,
          );
        }
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /**
   * Computes the final score weight for a word occurrence.
   *
   * @param {string} pos
   *  Part-of-speech tag of the word.
   *
   * @param {string | undefined} interaction
   *  Optional interaction type driving base weight.
   *
   * @returns {number}
   *  Final computed weight.
   */
  private computeWeight(pos: string, interaction?: string): number {
    return this.baseWeight(interaction) * this.posMultiplier(pos);
  }

  /**
   * Resolves the base weight for a given interaction type.
   *
   * @param {string | undefined} type
   *  Interaction type or undefined.
   *
   * @returns {number}
   *  Base interaction weight.
   */
  private baseWeight(type?: string): number {
    return INTERACTION_WEIGHTS[type ?? 'default'];
  }

  /**
   * Resolves the multiplier for a given part-of-speech.
   *
   * @param {string} pos
   *  Part-of-speech tag.
   *
   * @returns {number}
   *  POS multiplier.
   */
  private posMultiplier(pos: string): number {
    return POS_MULTIPLIERS[pos] ?? POS_MULTIPLIERS.DEFAULT;
  }

  // ---------------------------------------------------------------------------
  // User resolution
  // ---------------------------------------------------------------------------

  /**
   * Fetches an existing user by clientId or creates one if missing.
   *
   * This method is intentionally idempotent and safe
   * to call repeatedly for the same clientId.
   *
   * @param {string} clientId
   *  External client identifier.
   *
   * @returns {Promise<User>}
   *  Resolved or newly created User entity.
   *
   * TODO: Move this to a UserService
   */
  private async getOrCreateUser(clientId: string): Promise<User> {
    return (
      (await this.userRepository.findOne({ where: { clientId } })) ??
      this.userRepository.save(this.userRepository.create({ clientId }))
    );
  }
}
