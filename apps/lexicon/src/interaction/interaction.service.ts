import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, WordForm } from 'src/bank/bank.entity';
import { Interaction, UserWordStatistics } from './interaction.entity';
import { computeMastery, MasteryCurve } from './mastery.util';

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
  ) { }

  private getCurveForWord(): MasteryCurve {
    return MasteryCurve.DEFAULT;
  }

  // REQUIRED by gateway – unchanged behaviour
  async getUserWordStatistics(clientId: string) {
    const user = await this.userRepository.findOne({ where: { clientId } });
    if (!user) return [];

    return this.userWordStatisticsRepository.find({
      where: { user: { id: user.id } },
      relations: ['word'],
    });
  }

  async createInteraction(
    clientId: string,
    wordFormId: number,
    type: string,
  ) {
    this.logger.debug(
      `Creating interaction: clientId=${clientId}, wordFormId=${wordFormId}, type=${type}`,
    );

    const user = await this.userRepository.findOne({ where: { clientId } });
    if (!user) throw new Error(`User not found: ${clientId}`);

    const wordForm = await this.wordFormRepository.findOne({
      where: { id: wordFormId },
      relations: ['word'],
    });
    if (!wordForm) throw new Error(`WordForm not found: ${wordFormId}`);

    // ✅ MATCHES Interaction entity
    const interaction = this.interactionRepository.create({
      user,
      wordForm,
      type,
      timestamp: new Date(),
    });

    await this.interactionRepository.save(interaction);
    await this.updateUserWordStatistics(user.id, wordForm.word.id);

    return interaction;
  }

  async updateUserWordStatistics(userId: number, wordId: number) {
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const interactions = await this.interactionRepository
      .createQueryBuilder('i')
      .innerJoin('i.wordForm', 'wf')
      .where('i.userId = :userId', { userId })
      .andWhere('wf.wordId = :wordId', { wordId })
      .getMany();

    const weighted30Days = interactions
      .filter(i => i.timestamp >= thirtyDaysAgo)
      .reduce((sum, i) => sum + (this.typeWeights[i.type] ?? 0), 0);

    const curve = this.getCurveForWord();
    const score = computeMastery(weighted30Days, curve);

    let record = await this.userWordStatisticsRepository.findOne({
      where: {
        user: { id: userId },
        word: { id: wordId },
      },
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

    this.logger.debug(
      `Updated stats: userId=${userId}, wordId=${wordId}, score=${score.toFixed(2)}`,
    );
  }
}
