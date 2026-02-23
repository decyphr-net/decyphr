import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class CoursesKafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CoursesKafkaService.name);
  private readonly kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'courses-service',
    brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
  });

  private readonly producer: Producer = this.kafka.producer();

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log('Kafka producer disconnected');
  }

  async emit(topic: string, message: unknown) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }
}
