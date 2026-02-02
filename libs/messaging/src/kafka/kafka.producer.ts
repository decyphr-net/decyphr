import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

import { KafkaTopics } from './topics';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

export interface KafkaRequestOptions {
  correlationId?: string;
  sourceEvent?: string;
  extraHeaders?: Record<string, string>;
  retries?: number;
}

export interface KafkaHeaders {
  [key: string]: string | number | boolean | Buffer;
}

@Injectable()
export class KafkaProducer {
  private readonly logger = new Logger(KafkaProducer.name);

  constructor(
    @Inject('KAFKA_CLIENT')
    private readonly client: ClientKafka,
  ) {}

  private async withRetry<T>(fn: () => Promise<T>, retries: number = 3): Promise<T> {
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await fn();
      } catch (err) {
        if (attempt >= retries) throw err;
        this.logger.warn(`Attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
      }
    }
  }

  async request<T extends object>(
    topic: KafkaTopics,
    payload: T,
    dtoClass?: new () => T,
    options: KafkaRequestOptions = {},
  ): Promise<void> {
    const correlationId = options.correlationId ?? uuidv4();
    const sourceEvent = options.sourceEvent ?? 'manual_emit';
    const retries = options.retries ?? 3;

    if (dtoClass) {
      const instance = plainToInstance(dtoClass, payload);
      await validateOrReject(instance);
    }

    const headers: KafkaHeaders = {
      'correlation-id': correlationId,
      'source-event': sourceEvent,
      ...options.extraHeaders,
    };

    await this.withRetry(async () => {
      await this.client.emit(topic, { value: payload, headers });
      this.logger.debug(
        `Message emitted to "${topic}" (correlation-id: ${correlationId})`,
      );
    }, retries);
  }
}