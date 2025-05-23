import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { User, Word } from 'src/bank/bank.entity';
import { Repository } from 'typeorm';
import { Interaction, UserWordStatistics } from './interaction.entity';
import { InteractionGateway } from './interaction.gateway';

/**
 * Service responsible for handling user interactions with words and updating user word statistics.
 * Provides methods to create interactions, update user statistics, and select words for users.
 */
@Injectable()
export class InteractionService {
  private readonly logger = new Logger(InteractionService.name);

  /**
   * Constructs the InteractionService instance with dependencies injected via the constructor.
   *
   * @param interactionRepository - Repository for interaction entities.
   * @param userRepository - Repository for user entities.
   * @param wordRepository - Repository for word entities.
   * @param userWordStatisticsRepository - Repository for user word statistics entities.
   */
  constructor(
    @InjectRepository(Interaction)
    private readonly interactionRepository: Repository<Interaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(UserWordStatistics)
    private readonly userWordStatisticsRepository: Repository<UserWordStatistics>,
    @Inject(forwardRef(() => InteractionGateway))
    private readonly interactionGateway: InteractionGateway,
  ) { }

  async getUserWordStatistics(clientId: string) {
    const stats = await this.userWordStatisticsRepository
      .createQueryBuilder('uws')
      .innerJoinAndSelect('uws.word', 'word')
      .innerJoin('uws.user', 'user')
      .where('user.clientId = :clientId', { clientId })
      .orderBy('uws.score', 'DESC')
      .getMany();

    // Transform output to match the structure expected from the cron job
    return stats.map((stat) => ({
      userId: stat.id,
      wordId: stat.word.id,
      word: stat.word.word,
      pos_tag: stat.word.tag,
      lemma: stat.word.lemma,
      activeInteractions7Days: stat.activeInteractions7Days,
      passiveInteractions7Days: stat.passiveInteractions7Days,
      activeInteractions30Days: stat.activeInteractions30Days,
      passiveInteractions30Days: stat.passiveInteractions30Days,
      averageCorrectness7Days: stat.averageCorrectness7Days,
      averageCorrectness30Days: stat.averageCorrectness30Days,
      lastUpdated: stat.lastUpdated,
      score: stat.score ?? 0,
    }));
  }

  /**
   * Creates a new interaction between a user and a word, recording the type of interaction.
   *
   * @param clientId - The unique client identifier.
   * @param wordId - The unique word identifier.
   * @param type - The type of interaction (e.g., active or passive).
   * @returns The created interaction.
   * @throws Will throw an error if the user or word is not found.
   */
  async createInteraction(clientId: string, wordId: number, type: string) {
    this.logger.debug(
      `Creating interaction: clientId=${clientId}, wordId=${wordId}, type=${type}`,
    );

    let user = await this.userRepository.findOne({
      where: { clientId },
      relations: ['interactions'],
    });

    if (!user) {
      this.logger.warn(
        `User not found for clientId=${clientId}, creating user.`,
      );
      user = this.userRepository.create({ clientId });
      user = await this.userRepository.save(user);
      this.logger.log(`User created successfully: clientId=${clientId}`);
    }

    const word = await this.wordRepository.findOne({ where: { id: wordId } });

    if (!word) {
      this.logger.warn(`Word not found for wordId=${wordId}`);
      throw new Error('Word not found');
    }

    // ✅ Always create a new interaction for every event
    const interaction = this.interactionRepository.create({
      user, // Full user entity
      word, // Full word entity
      type,
      timestamp: new Date(),
    });

    await this.interactionRepository.save(interaction);
    this.logger.log(`Saved interaction: ${JSON.stringify(interaction)}`);

    return interaction;
  }

  /**
   * Emits the updated word statistics for a specific user over WebSocket.
   *
   * This method retrieves the `clientId` associated with the given `userId` and,
   * if found, sends the updated word statistics via the WebSocket gateway.
   *
   * @param userId - The ID of the user whose statistics have been updated.
   * @param updatedStats - The updated word statistics to be emitted.
   */
  async emitUpdatedWordStatistics(userId: number, updatedStats: any) {
    this.logger.log(`Emitting updated word statistics for user ${userId}`);

    // Retrieve clientId for the given userId
    const clientId = await this.userRepository
      .findOne({ where: { id: userId } })
      .then((user) => user?.clientId);

    if (!clientId) {
      this.logger.warn(`No clientId found for user ${userId}`);
      return;
    }

    // Call the WebSocket gateway to emit the updated statistics
    this.interactionGateway.sendWordStatistics(clientId, updatedStats);
  }

  /**
   * Recalculates and updates user word scores based on recent interactions.
   *
   * The score is calculated using a weighted formula:
   * - 60% weight on active interactions over the last 7 days.
   * - 40% weight on passive interactions over the last 7 days.
   * This method ensures that scores are only updated if the recalculated value differs.
   */
  async recalculateUserScores() {
    this.logger.log('Recalculating user scores...');

    await this.userWordStatisticsRepository
      .createQueryBuilder()
      .update()
      .set({
        score: () =>
          `(
              (activeInteractions30Days * 0.7) +
              (passiveInteractions30Days * 0.3) +
              (activeInteractions7Days * 1.2) +
              (passiveInteractions7Days * 0.5)
          ) / (
              (activeInteractions30Days + passiveInteractions30Days + activeInteractions7Days + passiveInteractions7Days + 1)
          )`,
      })
      .where(
        `score != (
            (activeInteractions30Days * 0.7) +
            (passiveInteractions30Days * 0.3) +
            (activeInteractions7Days * 1.2) +
            (passiveInteractions7Days * 0.5)
        ) / (
            (activeInteractions30Days + passiveInteractions30Days + activeInteractions7Days + passiveInteractions7Days + 1)
        )`,
      )
      .execute();

    this.logger.log('User scores updated successfully');
  }

  /**
   * Periodically updates the statistics for user-word interactions.
   * This method runs on a cron schedule (every 10 seconds) and inserts or updates statistics
   * for user interactions with words over the past 7 and 30 days.
   *
   * The statistics include counts of active and passive interactions, as well as the average correctness
   * of active interactions, for both 7-day and 30-day periods.
   */
  @Cron('*/10 * * * * *')
  async updateUserWordStatistics() {
    this.logger.log('Updating user word statistics...');

    try {
      const rawStats = await this.interactionRepository
        .createQueryBuilder('i')
        .select([
          'user.id AS userId',
          'word.id AS wordId',
          'word.token AS word',
          'word.tag AS pos_tag',
          'word.lemma AS lemma',
          `COUNT(CASE WHEN i.type = 'active' AND i.timestamp >= NOW() - INTERVAL 7 DAY THEN 1 END) AS activeInteractions7Days`,
          `COUNT(CASE WHEN i.type = 'passive' AND i.timestamp >= NOW() - INTERVAL 7 DAY THEN 1 END) AS passiveInteractions7Days`,
          `COUNT(CASE WHEN i.type = 'active' AND i.timestamp >= NOW() - INTERVAL 30 DAY THEN 1 END) AS activeInteractions30Days`,
          `COUNT(CASE WHEN i.type = 'passive' AND i.timestamp >= NOW() - INTERVAL 30 DAY THEN 1 END) AS passiveInteractions30Days`,
          `IFNULL(AVG(CASE WHEN i.type = 'active' AND i.timestamp >= NOW() - INTERVAL 7 DAY THEN i.correctness END), 0) AS averageCorrectness7Days`,
          `IFNULL(AVG(CASE WHEN i.type = 'active' AND i.timestamp >= NOW() - INTERVAL 30 DAY THEN i.correctness END), 0) AS averageCorrectness30Days`,
          'NOW() AS lastUpdated',
        ])
        .innerJoin('i.user', 'user')
        .innerJoin('i.word', 'word')
        .where('user.id IS NOT NULL')
        .andWhere('word.id IS NOT NULL')
        .groupBy('user.id, word.id')
        .getRawMany();

      for (const stat of rawStats) {
        let existingRecord = await this.userWordStatisticsRepository.findOne({
          where: {
            user: { id: stat.userId },
            word: { id: stat.wordId },
          },
        });

        if (existingRecord) {
          // Update existing entry
          await this.userWordStatisticsRepository.update(existingRecord.id, {
            activeInteractions7Days: stat.activeInteractions7Days,
            passiveInteractions7Days: stat.passiveInteractions7Days,
            activeInteractions30Days: stat.activeInteractions30Days,
            passiveInteractions30Days: stat.passiveInteractions30Days,
            averageCorrectness7Days: stat.averageCorrectness7Days,
            averageCorrectness30Days: stat.averageCorrectness30Days,
            lastUpdated: stat.lastUpdated,
          });

          // Fetch the updated record including score
          existingRecord = await this.userWordStatisticsRepository.findOne({
            where: { id: existingRecord.id },
          });
        } else {
          // Insert new entry
          existingRecord = await this.userWordStatisticsRepository.save({
            user: { id: stat.userId },
            word: { id: stat.wordId },
            activeInteractions7Days: stat.activeInteractions7Days,
            passiveInteractions7Days: stat.passiveInteractions7Days,
            activeInteractions30Days: stat.activeInteractions30Days,
            passiveInteractions30Days: stat.passiveInteractions30Days,
            averageCorrectness7Days: stat.averageCorrectness7Days,
            averageCorrectness30Days: stat.averageCorrectness30Days,
            lastUpdated: stat.lastUpdated,
          });
        }

        // Recalculate score
        await this.recalculateUserScores();

        // Emit updated statistics via WebSocket including the score
        await this.emitUpdatedWordStatistics(stat.userId, {
          userId: stat.userId,
          wordId: stat.wordId,
          word: stat.word,
          pos_tag: stat.pos_tag,
          lemma: stat.lemma,
          activeInteractions7Days: stat.activeInteractions7Days,
          passiveInteractions7Days: stat.passiveInteractions7Days,
          activeInteractions30Days: stat.activeInteractions30Days,
          passiveInteractions30Days: stat.passiveInteractions30Days,
          averageCorrectness7Days: stat.averageCorrectness7Days,
          averageCorrectness30Days: stat.averageCorrectness30Days,
          lastUpdated: stat.lastUpdated,
          score: existingRecord?.score ?? 0,
        });
      }

      this.logger.log('User word statistics updated successfully');
    } catch (err) {
      this.logger.error('Error updating user word statistics', err.stack);
    }
  }

  /**
   * Periodically selects words for users based on their performance and score.
   * This method runs on a cron schedule (every 10 seconds) and selects words from different score levels
   * for each user, aiming to balance their learning experience.
   *
   * The selected words are grouped by performance levels (0.8, 0.6, 0.4, 0.2, 0.0) and each level has a set number
   * of words to be selected. It logs the selected words for each user.
   */
  @Cron('*/10 * * * * *')
  async selectWordsForUsers() {
    this.logger.log('Selecting words for users...');

    try {
      const users = await this.userRepository.find();

      const levels = [0.8, 0.6, 0.4, 0.2, 0.0];
      const wordsPerLevel = 5;

      for (const user of users) {
        const selectedWords: Word[] = [];

        for (const level of levels) {
          const words = await this.wordRepository
            .createQueryBuilder('word')
            .innerJoin(
              'user_word_statistics',
              'uws',
              'uws.wordId = word.id AND uws.userId = :userId',
              { userId: user.id },
            )
            .where('uws.score >= :level AND uws.score < :nextLevel', {
              level,
              nextLevel: level + 0.2,
            })
            .orderBy('RAND()')
            .limit(wordsPerLevel)
            .getMany();

          selectedWords.push(...words);
        }

        this.logger.log(
          `Selected ${selectedWords.length} words for user ${user.id}`,
        );
      }
      this.logger.log('Word selection for users completed');
    } catch (err) {
      this.logger.error('Error selecting words for users', err.stack);
    }
  }
}
