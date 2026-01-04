import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { Interaction, UserWordStatistics } from './interaction.entity';
import { computeMastery, MasteryCurve } from './mastery.util';
/**
 * Service responsible for handling user interactions with words and computing weighted scores.
 */
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
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(UserWordStatistics)
    private readonly userWordStatisticsRepository: Repository<UserWordStatistics>,
  ) { }

  private getCurveForWord(word: Word): MasteryCurve {
    // Later: detect Irish function words, POS tags, etc.
    return MasteryCurve.DEFAULT;
  }

  /**
   * Creates a new interaction and updates the associated user-word statistics.
   */
  async createInteraction(clientId: string, wordId: number, type: string) {
    this.logger.debug(`Creating interaction: clientId=${clientId}, wordId=${wordId}, type=${type}`);

    const user = await this.userRepository.findOne({ where: { clientId } });
    if (!user) throw new Error(`User not found: ${clientId}`);

    const word = await this.wordRepository.findOne({ where: { id: wordId } });
    if (!word) throw new Error(`Word not found: ${wordId}`);

    const interaction = this.interactionRepository.create({
      user,
      word,
      type,
      timestamp: new Date(),
    });
    await this.interactionRepository.save(interaction);

    await this.updateUserWordStatistics(user.id, word.id);
    return interaction;
  }

  /**
   * Updates the user-word statistics (weighted scores, total interactions) for a given user and word.
   */
  async updateUserWordStatistics(userId: number, wordId: number) {
    const now = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const interactions = await this.interactionRepository.find({
      where: { user: { id: userId }, word: { id: wordId } },
    });

    const weighted7Days = interactions
      .filter(i => i.timestamp >= sevenDaysAgo)
      .reduce((sum, i) => sum + (this.typeWeights[i.type] ?? 0), 0);

    const weighted30Days = interactions
      .filter(i => i.timestamp >= thirtyDaysAgo)
      .reduce((sum, i) => sum + (this.typeWeights[i.type] ?? 0), 0);

    const total7Days = interactions.filter(i => i.timestamp >= sevenDaysAgo).length || 1;
    const total30Days = interactions.filter(i => i.timestamp >= thirtyDaysAgo).length || 1;

    const curve = this.getCurveForWord(
      await this.wordRepository.findOneOrFail({ where: { id: wordId } }),
    );

    const score = computeMastery(weighted30Days, curve);

    let record = await this.userWordStatisticsRepository.findOne({
      where: { user: { id: userId }, word: { id: wordId } },
    });

    if (!record) {
      record = this.userWordStatisticsRepository.create({
        user: { id: userId },
        word: { id: wordId },
      });
    }

    this.logger.debug("Current data:")
    this.logger.debug(`weighted7Days: ${record.weighted7Days}`);
    this.logger.debug(`weighted30Days: ${record.weighted30Days}`);
    this.logger.debug(`totalInteractions7Days: ${record.totalInteractions7Days}`);
    this.logger.debug(`totalInteractions30Days: ${record.totalInteractions30Days}`);
    this.logger.debug(`score: ${record.score}`);
    this.logger.debug(`lastUpdated: ${record.lastUpdated}`);

    this.logger.debug("Updating with:")
    this.logger.debug(`weighted7Days: ${weighted7Days}`);
    this.logger.debug(`weighted30Days: ${weighted30Days}`);
    this.logger.debug(`totalInteractions7Days: ${total7Days}`);
    this.logger.debug(`totalInteractions30Days: ${total30Days}`);
    this.logger.debug(`score: ${score}`);
    this.logger.debug(`lastUpdated: ${now}`);
    record.weighted7Days = weighted7Days;
    record.weighted30Days = weighted30Days;
    record.totalInteractions7Days = total7Days;
    record.totalInteractions30Days = total30Days;
    record.score = score;
    record.lastUpdated = now;

    await this.userWordStatisticsRepository.save(record);
    this.logger.debug(`Updated user-word statistics: userId=${userId}, wordId=${wordId}, score=${score.toFixed(2)}`);
  }

  /**
   * Fetches all user-word statistics for a given client.
   */
  async getUserWordStatistics(clientId: string) {
    const stats = await this.userWordStatisticsRepository
      .createQueryBuilder('uws')
      .innerJoinAndSelect('uws.word', 'word')
      .innerJoin('uws.user', 'user')
      .where('user.clientId = :clientId', { clientId })
      .orderBy('uws.score', 'DESC')
      .getMany();

    // Only return the fields you actually use
    return stats.map(stat => ({
      wordId: stat.word.id,
      word: stat.word.word,
      lemma: stat.word.lemma,
      pos: stat.word.tag,
      score: Number(stat.score ?? 0),
      lastUpdated: stat.lastUpdated,

      // Optional: if you plan to use them later
      weighted7Days: stat.weighted7Days,
      weighted30Days: stat.weighted30Days,
      totalInteractions7Days: stat.totalInteractions7Days,
      totalInteractions30Days: stat.totalInteractions30Days,
    }));
  }
}
