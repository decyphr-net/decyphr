import {
  Controller,
  Get,
  Inject,
  Logger,
  OnModuleInit,
  Param,
} from '@nestjs/common';
import { ClientKafka, MessagePattern } from '@nestjs/microservices';
import { AiInterfaceService } from './ai-interface.service';
import { TranslationDto } from './dto/translation.dto';

interface KafkaMessage<T> {
  key: string;
  value: T;
}

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
  @MessagePattern('translation.complete')
  async handleTranslationResponse(message: any) {
    try {
      this.logger.log(
        `Received translation response: ${JSON.stringify(message)}`,
      );

      const value = message;

      if (!value?.requestId) {
        this.logger.error('Invalid Kafka message: Missing requestId');
        return;
      }

      const record = {
        requestId: value.requestId,
        clientId: value.clientId,
        sourceLanguage: value.sourceLanguage,
        targetLanguage: value.targetLanguage,
        originalText: value.originalText,
        translated: value.translated,
      };

      // Store to database
      const translation = await this.service.saveTranslation(record);

      // Use the SAME key used since initial request
      const key = record.requestId;

      // Emit to KTable topic
      await this.client.emit('translation.response.table', {
        key,
        value: translation,
      });
      this.logger.log('✅ Stored + emitted translation.response.table');
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
  async translateText(message: KafkaMessage<TranslationDto>) {
    const translationRequest = message.value;
    this.logger.log(
      `Received translation request from Kafka: ${JSON.stringify(translationRequest)}`,
    );

    try {
      await this.client.emit('ai.translation.request', {
        key: translationRequest.requestId,
        value: translationRequest,
      });

      this.logger.log(
        `Translation request emitted to AI service with key ${translationRequest.requestId}`,
      );
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
      this.logger.error(
        `Failed to fetch translations for client ${clientId}:`,
        error.stack,
      );
      return {
        success: false,
        message: 'Failed to fetch translations',
      };
    }
  }
}
