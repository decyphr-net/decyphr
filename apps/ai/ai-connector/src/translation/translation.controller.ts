import { Controller, Logger } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Transport
} from '@nestjs/microservices';
import { z } from 'zod';
import { TranslationDto } from './translation-request.dto';
import { TranslationService } from './translation.service';

@Controller()
export class TranslationController {
  private readonly logger = new Logger(TranslationController.name);

  constructor(
    private readonly translationService: TranslationService,
  ) { }

  /**
   * Handles translation requests received from the `ai.translation.request` Kafka topic.
   *
   * @param {TranslationDto} payload - The translation request payload.
   * @returns {Promise<void>}
   */
  @EventPattern('ai.translation.request', Transport.KAFKA)
  async getTranslation<T extends z.ZodTypeAny>(
    @Payload() payload: any,
  ): Promise<void> {
    const message = payload?.value;

    this.logger.log(
      `📩 Received translation request for clientId: ${message.clientId}`,
    );

    try {
      // Generate translation based on the provided text and languages
      await this.translationService.handleTranslation(message);

      this.logger.log(
        `✅ Translation successful for clientId: ${message.clientId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error processing translation request for clientId: ${message.clientId}`,
        error.stack,
      );
    }
  }
}
