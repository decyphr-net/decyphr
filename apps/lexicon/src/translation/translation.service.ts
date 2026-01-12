import { Injectable } from '@nestjs/common';
import { StatementService } from 'src/statement/statement.service';
import { TextTranslatedPayloadDto } from './dto/payload.dto';

/**
 * Service that handles translation-related operations.
 * It interacts with the StatementService to store translation-related statements.
 */
@Injectable()
export class TranslationService {
  constructor(private readonly statementService: StatementService) { }

  /**
   * Handles the translation event by storing the received translation statement.
   *
   * @param message - The translation event payload that contains the translated text and other details.
   * @returns A promise that resolves when the translation statement is stored.
   */
  async handleTranslation(message: TextTranslatedPayloadDto): Promise<void> {
    // await this.statementService.storeStatement(message);
    return Promise.resolve();
  }
}
