import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interaction } from 'src/interaction/interaction.entity';
import { BreakdownDto } from 'src/translation/dto/payload.dto';
import { Repository } from 'typeorm';
import { User, Word } from './bank.entity';

@Injectable()
export class BankService {
  private readonly logger = new Logger(BankService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Word) private readonly wordRepository: Repository<Word>,
    @InjectRepository(Interaction)
    private readonly interactionRepository: Repository<Interaction>,
  ) { }

  /**
   * Saves the breakdown of words for a user based on the provided data.
   * If the user doesn't exist, it creates a new user. It also creates or updates words and interactions.
   *
   * @param breakdown The breakdown of words to be saved.
   * @param clientId The client ID of the user.
   * @param language The language of the words.
   * @param interactionType The type of interaction (e.g., passive or active).
   * @returns A promise indicating the completion of the operation.
   */
  async saveBreakdownForUser(
    breakdown: BreakdownDto[],
    clientId: string,
    language: string,
    interactionType: string,
  ): Promise<void> {
    this.logger.debug('Called');
    try {
      let user = await this.userRepository.findOne({ where: { clientId } });

      if (!user) {
        this.logger.log(
          `User with clientId ${clientId} not found. Creating new user.`,
        );
        user = this.userRepository.create({ clientId });
        user = await this.userRepository.save(user);
        this.logger.log(`User with clientId ${clientId} created successfully.`);
      } else {
        this.logger.log(`User with clientId ${clientId} found.`);
      }

      for (const item of breakdown) {
        let word = await this.wordRepository.findOne({
          where: {
            word: item.originalWord,
            tag: item.pos_tag,
            language: language,
            lemma: item.lemma,
          },
        });

        if (!word) {
          this.logger.log(
            `Word "${item.originalWord}" not found. Creating new word.`,
          );

          word = this.wordRepository.create({
            word: item.originalWord,
            tag: item.pos_tag,
            language: language,
            lemma: item.lemma,
          });

          word = await this.wordRepository.save(word);
          this.logger.log(`Word "${item.originalWord}" created successfully.`);
        } else {
          this.logger.log(`Word "${item.originalWord}" found.`);
        }

        const interaction = this.interactionRepository.create({
          user,
          word,
          type: interactionType,
          timestamp: new Date(),
        });

        await this.interactionRepository.save(interaction);
        this.logger.log(
          `✅ Interaction saved for word "${item.originalWord}" and user ${clientId}.`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error saving breakdown for user', error.stack);
      throw error;
    }
  }
}
