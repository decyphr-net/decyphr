// libs/messaging/src/kafka/translation-producer.ts
import { Injectable, Logger } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { KafkaProducer, KafkaRequestOptions } from './kafka.producer';
import { KafkaTopics } from './topics';
import { TranslationDto } from '../dto/translation.dto';

@Injectable()
export class TranslationProducer {
  private readonly logger = new Logger(TranslationProducer.name);

  constructor(private readonly producer: KafkaProducer) {}

  /**
   * Emit a translation request
   * - Validates payload
   * - Adds correlation ID if missing
   * - Sets the source event
   * - Retries automatically via KafkaProducer
   */
  async requestTranslation(payloadDto: TranslationDto, options?: Partial<KafkaRequestOptions>) {
    // 1️⃣ Validate DTO
    const dto = plainToInstance(TranslationDto, payloadDto);
    await validateOrReject(dto);

    // 2️⃣ Prepare Kafka request options
    const requestOptions: KafkaRequestOptions = {
      correlationId: options?.correlationId,
      sourceEvent: 'translating_statement',
      retries: options?.retries ?? 3,
      extraHeaders: options?.extraHeaders,
    };

    // 3️⃣ Emit using the legacy translation contract expected by translator/ai-connector.
    // This preserves compatibility with existing downstream consumers.
    const event = {
      requestId: dto.requestId,
      clientId: dto.clientId,
      sourceLanguage: dto.sourceLanguage,
      targetLanguage: dto.targetLanguage,
      statementId:
        typeof dto.statementId === 'number' ? String(dto.statementId) : undefined,
      interactions: [
        {
          type: dto.interaction.type,
          timestamp: dto.interaction.timestamp,
        },
      ],
      payload: {
        text: dto.text,
      },
    };

    // 4️⃣ Emit
    try {
      await this.producer.request(
        KafkaTopics.TRANSLATION_TRANSLATE,
        event,
        undefined,
        requestOptions,
      );

      this.logger.debug(
        `Translation request emitted for clientId=${dto.clientId} (correlation-id=${requestOptions.correlationId ?? 'generated'})`
      );
    } catch (err) {
      this.logger.error(
        `Failed to emit translation request for clientId=${dto.clientId}`,
        err
      );
      throw err;
    }
  }
}
