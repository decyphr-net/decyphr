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
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KafkaTopics, PhrasebookTokensDto } from '@decyphr/messaging';
import { PhrasebookService } from './phrasebook.service';
import { UpdatePhraseDto } from './phrasebook.dto';

type PhrasebookCommand =
  | {
      action: 'create';
      requestId: string;
      clientId: string;
      data: UpdatePhraseDto;
    }
  | {
      action: 'update';
      requestId: string;
      clientId: string;
      phraseId: number;
      data: UpdatePhraseDto;
    }
  | {
      action: 'delete';
      requestId: string;
      clientId: string;
      phraseId: number;
    }
  | {
      action: 'translate';
      requestId: string;
      clientId: string;
      phraseId: number;
    };

@Controller()
export class PhrasebookController {
  constructor(private readonly service: PhrasebookService) {}

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
  handlePhrasebookTokens(@Payload() payload: any) {
    const value = this.extractKafkaValue(payload);
    if (!value) return;
    return this.service.handlePhrasebookTokens(value as PhrasebookTokensDto);
  }

  @EventPattern('translation.complete')
  handleTranslationComplete(@Payload() payload: any) {
    const value = this.extractKafkaValue(payload);
    if (!value) return;

    return this.service.handleTranslationComplete(value);
  }

  @EventPattern(KafkaTopics.PHRASEBOOK_COMMANDS)
  async handleCommand(@Payload() payload: any) {
    const value = this.extractKafkaValue(payload);
    if (!value) return;
    const cmd: PhrasebookCommand = value;

    switch (cmd.action) {
      case 'create':
        await this.service.createPhrase(cmd.clientId, cmd.data, cmd.requestId);
        return;
      case 'update':
        await this.service.updatePhrase(
          cmd.phraseId,
          cmd.data,
          cmd.requestId,
        );
        return;
      case 'delete':
        await this.service.deletePhrase(cmd.phraseId, cmd.requestId);
        return;
      case 'translate':
        await this.service.generateTranslation(
          cmd.phraseId,
          cmd.clientId,
          cmd.requestId,
        );
        return;
      default:
        return;
    }
  }
}
