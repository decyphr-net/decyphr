import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interaction } from 'src/interaction/interaction.entity';
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
   * @param clientId The client ID of the user.
   * @param language The language of the words.
   * @param interactionType The type of interaction (e.g., passive or active).
   * @returns A promise indicating the completion of the operation.
   */
  async saveBreakdownForUser(
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
    } catch (error) {
      this.logger.error('❌ Error saving breakdown for user', error.stack);
      throw error;
    }
  }
}
