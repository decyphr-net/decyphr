import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { KafkaProducer } from './kafka.producer';
import { TranslationProducer } from './translation-producer';
import { StatementEventProducer } from './statement-event.producer';

export interface KafkaClientConfig {
  brokers: string[];
  [key: string]: unknown;
}

export interface KafkaConsumerConfig {
  groupId: string;
  [key: string]: unknown;
}

export interface KafkaMessagingModuleOptions {
  client: KafkaClientConfig;
  consumer?: KafkaConsumerConfig;
  producer?: Record<string, any>;
}

@Module({
  providers: [KafkaProducer, TranslationProducer, StatementEventProducer],
  exports: [KafkaProducer, TranslationProducer, StatementEventProducer],
})
export class KafkaMessagingModule {
  static register(options: KafkaMessagingModuleOptions): DynamicModule {
    return {
      module: KafkaMessagingModule,
      imports: [
        ClientsModule.register([
          {
            name: 'KAFKA_CLIENT',
            transport: Transport.KAFKA,
            options,
          },
        ]),
      ],
    };
  }
}
