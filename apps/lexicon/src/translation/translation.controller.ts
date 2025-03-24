import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Transport } from '@nestjs/microservices';
import { TextTranslatedPayloadDto } from './dto/payload.dto';
import { TranslationService } from './translation.service';

/**
 * Controller that listens for translation-related events.
 * It handles incoming translation responses from a Kafka topic and delegates
 * the processing of the translation payload to the TranslationService.
 */
@Controller()
export class TranslationController {
  private readonly logger = new Logger(TranslationController.name);

  constructor(private readonly translationService: TranslationService) { }

  /**
   * Event handler that listens for translation responses from the Kafka message broker.
   * This method is triggered when a message with the event pattern
   * 'ai.translation.response' is received.
   *
   * @param payload - The payload containing the translated text and associated metadata.
   * @returns void
   *
   * Logs the received payload and delegates further processing to the TranslationService.
   */
  @EventPattern('ai.translation.response', Transport.KAFKA)
  async handleEvent(
    @Payload() payload: TextTranslatedPayloadDto,
  ): Promise<void> {
    this.logger.log('Received translation response', JSON.stringify(payload));

    try {
      await this.translationService.handleTranslation(payload);
      this.logger.log('Translation processed successfully');
    } catch (error) {
      this.logger.error('Error processing translation', error.stack);
      throw error;
    }
  }
}
