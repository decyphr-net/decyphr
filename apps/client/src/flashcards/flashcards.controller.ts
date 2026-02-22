import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';

import { FlashcardsService } from './flashcards.service';

@Controller('flashcards')
export class FlashcardsController {
  constructor(
    private readonly authService: AuthService,
    private readonly flashcardsService: FlashcardsService,
  ) {}

  @Get()
  async getFlashcardsPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/flashcards/partial');
    return res.send(layoutHtml);
  }

  @Get('partial')
  async getFlashcardsPartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'flashcards',
      'flashcards.html',
    );
    return res.sendFile(partialPath);
  }

  @Get('study')
  async getStudyPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/flashcards/study/partial');

    return res.send(layoutHtml);
  }

  @Get('study/partial')
  async getStudyPartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'flashcards',
      'study.html',
    );

    return res.sendFile(partialPath);
  }

  @Get('decks')
  async getDecks(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.getDecks(clientId);
  }

  @Get('decks/:packId')
  async getDeck(
    @Req() req: AuthenticatedRequest,
    @Param('packId', ParseIntPipe) packId: number,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.getDeck(clientId, packId);
  }

  @Post('decks')
  async createDeck(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.createDeck(clientId, body);
  }

  @Post('decks/:packId/cards')
  async createCard(
    @Req() req: AuthenticatedRequest,
    @Param('packId', ParseIntPipe) packId: number,
    @Body() body: any,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.createCard(clientId, packId, body);
  }

  @Get('study/due')
  async getDueCards(
    @Req() req: AuthenticatedRequest,
    @Query('packId') packId?: string,
    @Query('limit') limit?: string,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);

    return this.flashcardsService.getDueCards(
      clientId,
      packId ? Number(packId) : undefined,
      limit ? Number(limit) : 20,
    );
  }

  @Post('cards/:cardId/attempt')
  async recordAttempt(
    @Req() req: AuthenticatedRequest,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() body: { grade: 'again' | 'hard' | 'good' | 'easy'; responseMs?: number },
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.recordAttempt(clientId, cardId, body);
  }
}
