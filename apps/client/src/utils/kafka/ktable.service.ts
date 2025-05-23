import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';

@Injectable()
export class KTableService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KTableService.name);
  private kafka = new Kafka({
    clientId: 'app-client',
    brokers: ['kafka:9092'],
  });

  private consumers: Map<string, Consumer> = new Map();
  private tables: Map<string, Map<string, any>> = new Map();
  private subscribers = new Map<string, Set<(key: string, value: any) => void>>();

  async onModuleInit() {
    this.logger.log('KTableService initialized');
  }

  async onModuleDestroy() {
    for (const [topic, consumer] of this.consumers.entries()) {
      try {
        await consumer.disconnect();
        this.logger.log(`Disconnected consumer for topic '${topic}'`);
      } catch (error) {
        this.logger.error(`Failed to disconnect consumer for topic '${topic}'`, error);
      }
    }
  }

  /**
   * Starts consuming a changelog topic and maintains its state in memory.
   * @param topic - The compacted topic representing the KTable.
   * @param groupId - The consumer group ID (defaults to 'ktable-<topic>').
   */
  async watchTable(topic: string, groupId = `ktable-${topic}`) {
    if (this.consumers.has(topic)) {
      this.logger.warn(`Already consuming topic '${topic}'`);
      return;
    }

    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    const state = new Map<string, any>();
    this.tables.set(topic, state);

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        console.log("New message!")
        const key = message.key?.toString();
        const value = message.value?.toString();

        if (key) {
          if (value === null) {
            state.delete(key);
          } else {
            let parsedValue: any = value;
            try {
              parsedValue = JSON.parse(value);
            } catch {
              parsedValue = value;
            }

            state.set(key, parsedValue);

            this.emitToSubscribers(topic, key, parsedValue);
          }
        }
      },
    });

    this.consumers.set(topic, consumer);
    this.logger.log(`Started KTable emulation from topic '${topic}'`);
  }

  /**
   * Gets the latest value of a key from a specific table.
   * @param topic - The changelog topic name.
   * @param key - The key to look up.
   */
  getValue(topic: string, key: string): any | undefined {
    return this.tables.get(topic)?.get(key);
  }

  /**
   * Returns the entire table (use carefully, can be large!).
   * @param topic - The topic to retrieve.
   */
  getAll(topic: string): Record<string, any> {
    const table = this.tables.get(topic);
    const result: Record<string, any> = {};
    table?.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  onUpdate(topic: string, callback: (key: string, value: any) => void) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(callback);
  }

  private emitToSubscribers(topic: string, key: string, value: any) {
    this.subscribers.get(topic)?.forEach((callback) => callback(key, value));
  }
}
