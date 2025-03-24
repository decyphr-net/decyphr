import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { BotsService } from './bots.service';
import { CreateBotDto } from './dtos/create-bot.dto';
import { UpdateBotDto } from './dtos/update-bot.dto';

@Controller('bots')
export class BotsController {
  private readonly logger = new Logger(BotsController.name);

  constructor(private readonly botsService: BotsService) { }

  /**
   * Retrieves all bots or filters them by language if a query parameter is provided.
   * @param {string} language - (Optional) Filter bots by language.
   * @returns {Promise<Bot[]>} - A list of bots.
   */
  @Get()
  async getAllBots(@Query('language') language?: string) {
    if (language) {
      this.logger.log(`Fetching bots with language: ${language}`);
      return this.botsService.findByLanguage(language);
    }

    this.logger.log('Fetching all bots');
    return this.botsService.findAll();
  }

  /**
   * Retrieves a bot by its ID.
   * @param {number} id - The ID of the bot.
   * @returns {Promise<Bot>} - The bot entity if found.
   */
  @Get(':id')
  async getBot(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Fetching bot with ID: ${id}`);
    return this.botsService.findOne(id);
  }

  /**
   * Creates a new bot in the database.
   * @param {CreateBotDto} botData - The data required to create a new bot.
   * @returns {Promise<Bot>} - The newly created bot entity.
   */
  @Post()
  async createBot(@Body() botData: CreateBotDto) {
    this.logger.log(`Creating new bot: ${botData.name}`);
    return this.botsService.create(botData);
  }

  /**
   * Updates an existing bot by ID.
   * @param {number} id - The ID of the bot to update.
   * @param {UpdateBotDto} botData - The updated bot data.
   * @returns {Promise<Bot>} - The updated bot entity.
   */
  @Put(':id')
  async updateBot(
    @Param('id', ParseIntPipe) id: number,
    @Body() botData: UpdateBotDto,
  ) {
    this.logger.log(`Updating bot with ID: ${id}`);
    return this.botsService.update(id, botData);
  }

  /**
   * Deletes a bot from the database.
   * @param {number} id - The ID of the bot to delete.
   * @returns {Promise<{ message: string }>} - A confirmation message upon successful deletion.
   */
  @Delete(':id')
  async deleteBot(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting bot with ID: ${id}`);
    return this.botsService.remove(id);
  }
}
