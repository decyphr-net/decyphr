import { Controller, Get, Inject, Logger, OnModuleInit, Param } from '@nestjs/common';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { AiInterfaceService } from './ai-interface.service';
import { TranslationDto } from './dto/translation.dto';

/**
 * Controller that handles translation-related requests and responses.
 * It communicates with Kafka and WebSocket gateway to send/receive translation data.
 */
@Controller()
export class AiInterfaceController implements OnModuleInit {
  private readonly logger = new Logger(AiInterfaceController.name);

  constructor(
    private readonly service: AiInterfaceService,
    @Inject('TRANSLATION') private readonly client: ClientKafka,
  ) { }

  /**
   * Connects the Kafka client on module initialization.
   * Logs success or failure.
   */
  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Kafka Client Connected');
    } catch (error) {
      this.logger.error('Kafka Client Connection Failed', error.stack);
    }
  }

  /**
   * Handles translation response messages from Kafka.
   * Saves the translation and sends the response via WebSocket if the gateway is ready.
   * Logs success or failure.
   *
   * @param response The translation response received from Kafka.
   */
  // TODO: For now, use the full breakdown provided by the `lexicon.update`
  @MessagePattern('lexicon.update')
  async handleTranslationResponse(response: any) {
    try {
      this.logger.log(
        `Received translation response: ${JSON.stringify(response)}`,
      );

      if (!response || !response.translationResponse) {
        this.logger.error('Invalid Kafka message: Missing translationResponse');
        return;
      }

      const translation = await this.service.saveTranslation({
        clientId: response.clientId,
        originalText: response.statement,
        detectedLanguage: response.translationResponse.detectedLanguage,
        targetLanguage: 'en',
        translatedText: response.translationResponse.translatedText,
        alternatives: response.translationResponse.alternatives || [],
        breakdown: Array.isArray(response.translationResponse.breakdown)
          ? response.translationResponse.breakdown
          : [],
      });

      const key = `${response.clientId}|${response.sourceLanguage}|${response.targetLanguage}`;

      await this.client.emit('translation.response.table', { key, value: translation });
      this.logger.log('✅ Translation response emitted to translation.response.table topic');
    } catch (error) {
      this.logger.error('Failed to handle translation response', error);
    }
  }

  /**
   * Handles translation request messages from Kafka.
   * Emits a translation request to the AI service.
   * Logs the request.
   *
   * @param translationRequest The translation request from Kafka.
   */
  @MessagePattern('translation.translate')
  async translateText(@Payload() translationRequest: TranslationDto) {
    this.logger.log('Received translation request from Kafka');

    try {
      this.client.emit('ai.translation.request', translationRequest);
      this.logger.log('Translation request emitted to AI service');
    } catch (error) {
      this.logger.error('Failed to emit translation request', error.stack);
    }
  }

  @Get('translations/:clientId')
  async getTranslationsForClient(@Param('clientId') clientId: string) {
    this.logger.log(`Fetching translations for client: ${clientId}`);
    try {
      const translations = await this.service.getTranslations(clientId);
      return {
        success: true,
        data: translations,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch translations for client ${clientId}:`, error.stack);
      return {
        success: false,
        message: 'Failed to fetch translations',
      };
    }
  }
}
