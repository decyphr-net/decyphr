import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Consumer,
  EachMessageHandler,
  EachMessagePayload,
  Kafka,
  Producer,
} from 'kafkajs';

/**
 * KafkaService provides an abstraction over the KafkaJS producer API.
 * It handles producer connection lifecycle and message emission.
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);

  private kafka = new Kafka({
    clientId: 'app-client',
    brokers: ['kafka:9092'],
  });

  private producer: Producer = this.kafka.producer();
  private consumers: Map<
    string,
    {
      consumer: Consumer;
      handlers: Map<string, EachMessageHandler>;
      hasRun: boolean;
    }
  > = new Map();

  /**
   * Initializes the Kafka producer connection on module startup.
   */
  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', error);
    }
  }

  /**
   * Disconnects the Kafka producer gracefully on module shutdown.
   */
  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka producer', error);
    }
  }

  /**
   * Sends a message to the specified Kafka topic.
   * @param topic - Kafka topic to send the message to.
   * @param message - Payload to be serialized and sent.
   */
  async emit(topic: string, message: unknown) {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      this.logger.debug(
        `Message emitted to topic '${topic}': ${JSON.stringify(message)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to emit message to topic '${topic}'`, error);
    }
  }

  /**
   * Subscribes to a Kafka topic and registers a message handler.
   * @param topic - Kafka topic to subscribe to.
   * @param groupId - Consumer group ID.
   * @param handler - Async function to handle each received message.
   */
  async consume(
    topics: string[],
    groupId: string,
    onMessage: (payload: EachMessagePayload) => Promise<void>,
  ) {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();

    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
      this.logger.debug(`Subscribed to topic '${topic}' in group '${groupId}'`);
    }

    await consumer.run({
      eachMessage: async (payload) => {
        await onMessage(payload);
      },
    });

    this.logger.log(`Kafka consumer running for group '${groupId}'`);
  }
}
