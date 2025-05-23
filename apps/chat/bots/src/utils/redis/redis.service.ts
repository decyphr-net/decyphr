import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

/**
 * RedisService is a wrapper around the ioredis client,
 * responsible for managing Redis connections in a NestJS app.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis;

  /**
   * Initializes the Redis client on application startup.
   * Logs the connection status and configures event listeners.
   */
  async onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connected');
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Redis connection error', err);
    });
  }

  /**
   * Closes the Redis connection when the module is destroyed.
   */
  async onModuleDestroy() {
    try {
      await this.client.quit();
      this.logger.log('🚪 Redis connection closed');
    } catch (error) {
      this.logger.error('❌ Failed to close Redis connection', error);
    }
  }
}
