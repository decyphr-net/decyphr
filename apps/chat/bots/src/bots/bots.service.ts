import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Bot } from './bots.entity';
import { CreateBotDto } from './dtos/create-bot.dto';
import { UpdateBotDto } from './dtos/update-bot.dto';

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);

  constructor(
    @InjectRepository(Bot) private readonly botRepository: Repository<Bot>,
  ) { }

  /**
   * Retrieves all bots from the database.
   * @returns {Promise<Bot[]>} - An array of bots.
   */
  async findAll(): Promise<Bot[]> {
    this.logger.log('Fetching all bots');
    return await this.botRepository.find();
  }

  /**
   * Retrieves a bot by its ID.
   * @param {number} id - The ID of the bot.
   * @returns {Promise<Bot>} - The bot entity if found.
   */
  async findOne(id: number): Promise<Bot> {
    this.logger.log(`Fetching bot with ID: ${id}`);
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot) {
      this.logger.warn(`Bot with ID ${id} not found`);
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }
    return bot;
  }

  /**
   * Filters bots by language.
   * @param {string} language - The language to filter bots by.
   * @returns {Promise<Bot[]>} - A list of bots matching the specified language.
   */
  async findByLanguage(language: string): Promise<Bot[]> {
    this.logger.log(`Fetching bots with language: ${language}`);
    return await this.botRepository.find({
      where: { language: Like(`%${language}%`) },
    });
  }

  /**
   * Creates a new bot in the database.
   * @param {CreateBotDto} createBotDto - The bot data.
   * @returns {Promise<Bot>} - The newly created bot.
   */
  async create(createBotDto: CreateBotDto): Promise<Bot> {
    this.logger.log(`Creating bot: ${createBotDto.name}`);
    const bot = this.botRepository.create(createBotDto);
    return await this.botRepository.save(bot);
  }

  /**
   * Updates an existing bot.
   * @param {number} id - The ID of the bot.
   * @param {UpdateBotDto} updateBotDto - The updated bot data.
   * @returns {Promise<Bot>} - The updated bot entity.
   */
  async update(id: number, updateBotDto: UpdateBotDto): Promise<Bot> {
    this.logger.log(`Updating bot with ID: ${id}`);
    const bot = await this.findOne(id);
    Object.assign(bot, updateBotDto);
    return await this.botRepository.save(bot);
  }

  /**
   * Deletes a bot from the database.
   * @param {number} id - The ID of the bot.
   * @returns {Promise<{ message: string }>} - A success message.
   */
  async remove(id: number) {
    this.logger.log(`Deleting bot with ID: ${id}`);
    const result = await this.botRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`Bot with ID ${id} not found`);
      throw new NotFoundException(`Bot with ID ${id} was not found`);
    }
    return { message: 'Bot successfully deleted' };
  }
}
