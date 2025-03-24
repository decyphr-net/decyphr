import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BankService } from 'src/bank/bank.service';
import { TextTranslatedPayloadDto } from 'src/translation/dto/payload.dto';
import { Repository } from 'typeorm';
import { Statement } from './statement.entity';

/**
 * Service responsible for handling statements in the system.
 * This includes storing translation-related statements and processing additional user data.
 */
@Injectable()
export class StatementService {
  private readonly logger = new Logger(StatementService.name);

  constructor(
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    private readonly bankService: BankService,
  ) { }

  /**
   * Stores the translation statement and related breakdown information for a user.
   *
   * @param message - The translation payload that contains the statement, translation details, and metadata.
   * @returns A promise that resolves when the statement and breakdown information have been stored.
   */
  async storeStatement(message: TextTranslatedPayloadDto): Promise<void> {
    try {
      const timestamp = new Date(+message.timestamp);

      const statement = await this.statementRepository.create({
        statement: message.statement.replace(/(\r\n|\n|\r)/gm, ''), // Removing unwanted line breaks
        language: message.translationResponse.detectedLanguage,
        timestamp: timestamp,
        source: message.source,
        clientId: message.clientId,
      });

      this.logger.log('Storing statement: ', statement);

      await this.statementRepository.save(statement);

      await this.bankService.saveBreakdownForUser(
        message.translationResponse.breakdown,
        message.clientId,
        message.translationResponse.detectedLanguage,
        message.interactionType,
      );
    } catch (error) {
      this.logger.error('Failed to store statement', error.stack);
      throw error;
    }
  }
}
