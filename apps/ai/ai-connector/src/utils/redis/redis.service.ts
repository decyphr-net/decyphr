import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: RedisClient;
  private readonly logger = new Logger(RedisService.name);

  /**
   * Initializes the Redis client on module startup.
   * Connects using environment variables or defaults.
   */
  async onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connected successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Redis connection error', err);
    });
  }

  /**
   * Gracefully closes the Redis connection when the application shuts down.
   */
  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('🛑 Redis connection closed');
    }
  }
}
