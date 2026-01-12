import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, WordForm } from 'src/bank/bank.entity';
import { WordScoringService } from 'src/lexicon/scoring.service';
import { Interaction, UserWordStatistics } from './interaction.entity';
import { MasteryCurve } from './mastery.util';

@Injectable()
export class InteractionService {
  private readonly logger = new Logger(InteractionService.name);

  private readonly typeWeights: Record<string, number> = {
    lexicon_import: 0.25,
    translate_text: 0.4,
    chat_message: 0.6,
    chat_message_bot: 0.3,
    passive_read: 0.1,
    default: 0.3,
  };

  constructor(
    @InjectRepository(Interaction)
    private readonly interactionRepository: Repository<Interaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WordForm)
    private readonly wordFormRepository: Repository<WordForm>,
    @InjectRepository(UserWordStatistics)
    private readonly userWordStatisticsRepository: Repository<UserWordStatistics>,
    private readonly scoringService: WordScoringService,
  ) { }

  /**
   * Returns the mastery curve to be used for all words.
   * @returns {MasteryCurve} The default mastery curve
   */
  private getCurveForWord(): MasteryCurve {
    return MasteryCurve.DEFAULT;
  }

  /**
   * Retrieves all word statistics for a given user.
   * @param {string} clientId - The client identifier for the user
   * @returns {Promise<UserWordStatistics[]>} Array of user word statistics including the related word entity
   */
  async getUserWordStatistics(clientId: string) {
    this.logger.debug(`Fetching word statistics for clientId=${clientId}`);
    const user = await this.userRepository.findOne({ where: { clientId } });
    if (!user) {
      this.logger.warn(`User not found for clientId=${clientId}`);
      return [];
    }

    const stats = await this.userWordStatisticsRepository.find({
      where: { user: { id: user.id } },
      relations: ['word'],
    });

    this.logger.debug(
      `Found ${stats.length} word statistics for clientId=${clientId}`,
    );
    return stats;
  }

  /**
   * Creates a new interaction record for a user and updates their word statistics.
   * @param {string} clientId - The client identifier for the user
   * @param {number} wordFormId - The ID of the word form being interacted with
   * @param {string} type - The type of interaction (e.g., "chat_message", "lexicon_import")
   * @returns {Promise<Interaction>} The saved interaction entity
   * @throws {Error} If user or word form cannot be found
   */
  async createInteraction(clientId: string, wordFormId: number, type: string) {
    this.logger.debug(
      `Creating interaction: clientId=${clientId}, wordFormId=${wordFormId}, type=${type}`,
    );

    const user = await this.userRepository.findOne({ where: { clientId } });
    if (!user) {
      this.logger.error(`User not found for clientId=${clientId}`);
      throw new Error(`User not found: ${clientId}`);
    }

    const wordForm = await this.wordFormRepository.findOne({
      where: { id: wordFormId },
      relations: ['word'],
    });
    if (!wordForm) {
      this.logger.error(`WordForm not found for wordFormId=${wordFormId}`);
      throw new Error(`WordForm not found: ${wordFormId}`);
    }

    // ✅ MATCHES Interaction entity
    const interaction = this.interactionRepository.create({
      user,
      wordForm,
      word: wordForm.word,
      type,
      timestamp: new Date(),
    });

    await this.interactionRepository.save(interaction);
    this.logger.log(
      `Saved interaction id=${interaction.id} for userId=${user.id}`,
    );

    return await this.updateUserWordStatistics(user.id, wordForm.word.id);
  }

  /**
   * Updates a user's statistics for a specific word based on recent interactions.
   * @param {number} userId - The internal user ID
   * @param {number} wordId - The internal word ID
   * @returns {Promise<void>}
   */
  async updateUserWordStatistics(userId: number, wordId: number) {
    const now = new Date();
    const curve = this.getCurveForWord();

    const interactions = await this.interactionRepository
      .createQueryBuilder('i')
      .innerJoin('i.wordForm', 'wf')
      .where('i.userId = :userId', { userId })
      .andWhere('wf.wordId = :wordId', { wordId })
      .getMany();

    const { score, weighted30Days } = this.scoringService.scoreWord(
      interactions,
      curve,
    );

    let record = await this.userWordStatisticsRepository.findOne({
      where: { user: { id: userId }, word: { id: wordId } },
    });

    if (!record) {
      record = this.userWordStatisticsRepository.create({
        user: { id: userId },
        word: { id: wordId },
      });
    }

    record.weighted30Days = weighted30Days;
    record.totalInteractions30Days = interactions.length || 1;
    record.score = score;
    record.lastUpdated = now;

    await this.userWordStatisticsRepository.save(record);

    this.logger.log(
      `Updated stats: userId=${userId}, wordId=${wordId}, score=${score.toFixed(2)}`,
    );
  }
}
