import { Injectable } from '@nestjs/common';

import { KafkaProducer, KafkaRequestOptions } from './kafka.producer';
import { KafkaTopics } from './topics';
import { StatementEventDto } from '../dto/statement-event.dto';

@Injectable()
export class StatementEventProducer {
  constructor(private readonly producer: KafkaProducer) {}

  async emitStatementEvent(event: StatementEventDto, options?: Partial<KafkaRequestOptions>) {
    await this.producer.request(KafkaTopics.STATEMENT_EVENTS, event, StatementEventDto, {
      sourceEvent: 'phrasebook.statement',
      retries: options?.retries ?? 3,
      extraHeaders: options?.extraHeaders,
      correlationId: options?.correlationId,
    });
  }
}
