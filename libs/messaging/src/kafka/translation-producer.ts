// libs/messaging/src/kafka/translation-producer.ts
import { Injectable, Logger } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { create } from '@bufbuild/protobuf';

import { TranslationRequestSchema, TranslationRequest } from '../generated/messaging/translation/request_pb';
import { InteractionMetadataSchema } from '../generated/messaging/common/interaction_pb';
import { EntityReferenceSchema } from '../generated/messaging/common/entity_pb';

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

    // 2️⃣ Convert to protobuf
    const proto: TranslationRequest = create(TranslationRequestSchema, {
      requestId: dto.requestId,
      clientId: dto.clientId,
      text: dto.text,
      sourceLanguage: dto.sourceLanguage,
      targetLanguage: dto.targetLanguage,

      interaction: create(InteractionMetadataSchema, {
        type: dto.interaction.type,
        timestamp: BigInt(dto.interaction.timestamp),
      }),

      entity: dto.statementId
        ? create(EntityReferenceSchema, {
            entityType: 'statement',
            id: BigInt(dto.statementId),
          })
        : undefined,
    });

    // 3️⃣ Prepare Kafka request options
    const requestOptions: KafkaRequestOptions = {
      correlationId: options?.correlationId,
      sourceEvent: 'translating_statement',
      retries: options?.retries ?? 3,
      extraHeaders: options?.extraHeaders,
    };

    // 4️⃣ Emit
    try {
      await this.producer.request(KafkaTopics.TRANSLATION_TRANSLATE, proto, undefined, requestOptions);

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