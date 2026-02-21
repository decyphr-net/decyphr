import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KafkaTopics, PhrasebookTokensDto } from '@decyphr/messaging';
import { PhrasebookService } from './phrasebook.service';
import { UpdatePhraseDto } from './phrasebook.dto';

@Controller()
export class PhrasebookController {
  constructor(private readonly service: PhrasebookService) {}

  // ---------------- CRUD ----------------

  @Get('phrases')
  getPhrasebook(@Query('clientId') clientId: string) {
    return this.service.getPhrasebook(clientId);
  }

  @Get('phrases/:id')
  getPhrase(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPhrase(id);
  }

  @Post('phrases')
  createPhrase(
    @Query('clientId') clientId: string,
    @Body() body: UpdatePhraseDto,
  ) {
    return this.service.createPhrase(clientId, body);
  }

  @Put('phrases/:id')
  updatePhrase(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePhraseDto,
  ) {
    return this.service.updatePhrase(id, body);
  }

  @Delete('phrases/:id')
  deletePhrase(@Param('id', ParseIntPipe) id: number) {
    return this.service.deletePhrase(id);
  }

  @Post('phrases/:id/translate')
  generateTranslation(
    @Param('id', ParseIntPipe) id: number,
    @Query('clientId') clientId: string,
  ) {
    return this.service.generateTranslation(id, clientId);
  }

  @EventPattern(KafkaTopics.PHRASEBOOK_TOKENS)
  handlePhrasebookTokens(
    @Payload(new ValidationPipe({ transform: true }))
    payload: PhrasebookTokensDto,
  ) {
    return this.service.handlePhrasebookTokens(payload);
  }

  @EventPattern('translation.complete')
  handleTranslationComplete(@Payload() payload: any) {
    const value =
      payload && typeof payload === 'object' && 'value' in payload
        ? payload.value
        : payload;

    return this.service.handleTranslationComplete(value);
  }
}
