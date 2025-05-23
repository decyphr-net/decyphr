import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/utils/redis/redis.service';
import { Repository } from 'typeorm';
import { Bot } from './bots.entity';
import { CreateBotDto } from './dtos/create-bot.dto';
import { UpdateBotDto } from './dtos/update-bot.dto';

@Injectable()
export class BotsService implements OnModuleInit {
  private readonly logger = new Logger(BotsService.name);

  constructor(
    @InjectRepository(Bot) private readonly botRepository: Repository<Bot>,
    private readonly redis: RedisService,
  ) { }

  /**
   * On module initialization, cache all bots in Redis.
   */
  async onModuleInit() {
    this.logger.log('🔧 BotsService initializing: caching bots in Redis');
    await this.cacheBotsInRedis();
  }

  /**
   * Caches all bots in Redis using their ID as the key.
   * Utilizes Redis pipelining for batch performance.
   * Automatically refreshes cache every hour.
   */
  private async cacheBotsInRedis() {
    const bots = await this.findAll();
    const pipeline = this.redis.client.multi();

    bots.forEach((bot) => {
      pipeline.set(`bot:${bot.id}`, JSON.stringify(bot));
    });

    await pipeline.exec();
    this.logger.log(`✅ Cached ${bots.length} bots in Redis`);

    // Schedule periodic cache refresh every hour
    setInterval(
      async () => {
        try {
          const refreshedBots = await this.findAll();
          const refreshPipeline = this.redis.client.multi();
          refreshedBots.forEach((bot) => {
            refreshPipeline.set(`bot:${bot.id}`, JSON.stringify(bot));
          });
          await refreshPipeline.exec();
          this.logger.log(
            `♻️ Refreshed Redis cache for ${refreshedBots.length} bots`,
          );
        } catch (err) {
          this.logger.error('❌ Error refreshing bot cache in Redis', err);
        }
      },
      1000 * 60 * 60,
    );
  }

  /**
   * Retrieves all bots, preferring Redis cache if available.
   * @returns {Promise<Bot[]>} - An array of bots.
   */
  async findAll(): Promise<Bot[]> {
    this.logger.log('📥 Fetching all bots');
    const keys = await this.redis.client.keys('bot:*');

    if (keys.length > 0) {
      const cached = await this.redis.client.mget(...keys);
      const bots = cached
        .map((item) => {
          try {
            return item ? JSON.parse(item) : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Bot[];

      this.logger.log(`📦 Retrieved ${bots.length} bots from Redis`);
      return bots;
    }

    this.logger.log('🔄 Redis cache empty, falling back to DB');
    return await this.botRepository.find();
  }

  /**
   * Retrieves a single bot by its ID, checking Redis cache first.
   * @param {number} id - The ID of the bot.
   * @returns {Promise<Bot>} - The bot if found, otherwise throws NotFoundException.
   */
  async findOne(id: number): Promise<Bot> {
    this.logger.log(`🔍 Fetching bot with ID: ${id}`);

    const cached = await this.redis.client.get(`bot:${id}`);
    if (cached) {
      this.logger.log(`📦 Bot ${id} found in Redis`);
      return JSON.parse(cached);
    }

    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      this.logger.warn(`⚠️ Bot with ID ${id} not found`);
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    await this.redis.client.set(`bot:${id}`, JSON.stringify(bot));
    this.logger.log(`📦 Cached bot ${id} in Redis after DB fetch`);
    return bot;
  }

  /**
   * Finds bots matching a given language. Falls back to DB if Redis doesn't contain all bots.
   * @param {string} language - The language to filter bots by.
   * @returns {Promise<Bot[]>} - A list of bots.
   */
  async findByLanguage(language: string): Promise<Bot[]> {
    this.logger.log(`🔤 Fetching bots with language: ${language}`);
    const allBots = await this.findAll();
    const matched = allBots.filter((bot) =>
      bot.language.toLowerCase().includes(language.toLowerCase()),
    );
    return matched;
  }

  /**
   * Creates a new bot and caches it in Redis.
   * @param {CreateBotDto} createBotDto - The bot data.
   * @returns {Promise<Bot>} - The created bot.
   */
  async create(createBotDto: CreateBotDto): Promise<Bot> {
    this.logger.log(`➕ Creating bot: ${createBotDto.name}`);
    const bot = this.botRepository.create(createBotDto);
    const saved = await this.botRepository.save(bot);

    await this.redis.client.set(`bot:${saved.id}`, JSON.stringify(saved));
    this.logger.log(`🧠 Cached created bot in Redis: bot:${saved.id}`);
    return saved;
  }

  /**
   * Updates a bot and syncs changes to Redis.
   * @param {number} id - Bot ID.
   * @param {UpdateBotDto} updateBotDto - Updated fields.
   * @returns {Promise<Bot>} - The updated bot.
   */
  async update(id: number, updateBotDto: UpdateBotDto): Promise<Bot> {
    this.logger.log(`✏️ Updating bot with ID: ${id}`);
    const bot = await this.findOne(id);
    Object.assign(bot, updateBotDto);
    const updated = await this.botRepository.save(bot);

    await this.redis.client.set(`bot:${id}`, JSON.stringify(updated));
    this.logger.log(`🔄 Redis updated for bot:${id}`);
    return updated;
  }

  /**
   * Removes a bot from the database and Redis.
   * @param {number} id - Bot ID.
   * @returns {Promise<{ message: string }>} - Success message.
   */
  async remove(id: number) {
    this.logger.log(`🗑️ Deleting bot with ID: ${id}`);
    const result = await this.botRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`⚠️ Bot with ID ${id} not found for deletion`);
      throw new NotFoundException(`Bot with ID ${id} was not found`);
    }

    await this.redis.client.del(`bot:${id}`);
    this.logger.log(`❌ Removed bot:${id} from Redis`);
    return { message: 'Bot successfully deleted' };
  }
}
