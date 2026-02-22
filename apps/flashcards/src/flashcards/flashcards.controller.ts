import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KafkaTopics } from '@decyphr/messaging';

import {
  CreateFlashcardDto,
  CreateFlashcardPackWithCardsDto,
  GetDueCardsQueryDto,
  RecordAttemptDto,
} from './flashcards.dto';
import { FlashcardsService } from './flashcards.service';

@Controller()
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  private extractKafkaValue(payload: unknown): any {
    let value: unknown = payload;

    if (typeof value === 'object' && value !== null && 'value' in value) {
      value = (value as { value: unknown }).value;
    }

    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }

    if (typeof value === 'object' && value !== null && 'value' in value) {
      const nested = (value as { value: unknown }).value;
      if (typeof nested === 'string') {
        try {
          value = JSON.parse(nested);
        } catch {
          return null;
        }
      } else if (nested != null) {
        value = nested;
      }
    }

    return value;
  }

  @Get('packs')
  listPacks(@Query('clientId') clientId: string) {
    return this.flashcardsService.listPacks(clientId);
  }

  @Post('packs')
  createPack(
    @Query('clientId') clientId: string,
    @Body() body: CreateFlashcardPackWithCardsDto,
  ) {
    return this.flashcardsService.createPackWithCards(clientId, body);
  }

  @Get('packs/:packId')
  getPack(
    @Query('clientId') clientId: string,
    @Param('packId', ParseIntPipe) packId: number,
  ) {
    return this.flashcardsService.getPack(clientId, packId);
  }

  @Post('packs/:packId/cards')
  createCard(
    @Query('clientId') clientId: string,
    @Param('packId', ParseIntPipe) packId: number,
    @Body() body: CreateFlashcardDto,
  ) {
    return this.flashcardsService.createCard(clientId, packId, body);
  }

  @Get('study/due')
  getDueCards(
    @Query('clientId') clientId: string,
    @Query() query: GetDueCardsQueryDto,
  ) {
    return this.flashcardsService.getDueCards(clientId, query);
  }

  @Post('cards/:cardId/attempt')
  recordAttempt(
    @Query('clientId') clientId: string,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() body: RecordAttemptDto,
  ) {
    return this.flashcardsService.recordAttempt(clientId, cardId, body);
  }

  @EventPattern(KafkaTopics.FLASHCARDS_COMMANDS)
  async handleCommand(@Payload() payload: any) {
    const value = this.extractKafkaValue(payload);
    if (!value) {
      return;
    }

    return this.flashcardsService.handleCommand(value);
  }
}
