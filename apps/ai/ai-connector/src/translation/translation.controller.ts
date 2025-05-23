import { Controller, Inject, Logger } from '@nestjs/common';
import {
  ClientKafka,
  EventPattern,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { z } from 'zod';
import { TranslateDto } from './translation-request.dto';
import { TranslationService } from './translation.service';

@Controller()
export class TranslationController {
  private readonly logger = new Logger(TranslationController.name);

  constructor(
    @Inject('TRANSLATION') private readonly translationClient: ClientKafka,
    private readonly translationService: TranslationService,
  ) { }

  /**
   * Handles translation requests received from the `ai.translation.request` Kafka topic.
   *
   * @param {TranslateDto} payload - The translation request payload.
   * @returns {Promise<void>}
   */
  @EventPattern('ai.translation.request', Transport.KAFKA)
  async getTranslation<T extends z.ZodTypeAny>(
    @Payload() payload: TranslateDto,
  ): Promise<void> {
    this.logger.log(
      `📩 Received translation request for clientId: ${payload.clientId}`,
    );

    try {
      // Generate translation based on the provided text and languages
      await this.translationService.handleTranslation(payload);

      this.logger.log(
        `✅ Translation successful for clientId: ${payload.clientId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error processing translation request for clientId: ${payload.clientId}`,
        error.stack,
      );
    }
  }
}
