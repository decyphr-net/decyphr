import { readFile } from 'fs/promises';
import { join } from 'path';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { PhrasebookService } from './phrasebook.service';
import { UpdatePhraseDto } from './phrasebook.dto';

@Controller('phrasebook')
export class PhrasebookController {
  constructor(
    private readonly authService: AuthService,
    private readonly phrasebookService: PhrasebookService,
  ) {}

  // ---------------- SSE ----------------

  @Get('/stream')
  async stream(@Res() res: Response, @Req() req: AuthenticatedRequest) {
    const user = await this.authService.getUserFromSession(req);
    this.phrasebookService.registerSseClient(user.clientId, res);
  }

  /**
   * Serves the full layout and injects the phrasebook partial route.
   */
  @Get()
  async getPhrasebookPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/phrasebook/partial');
    return res.send(layoutHtml);
  }

  /**
   * Returns the phrasebook partial to be injected into the layout.
   */
  @Get('partial')
  async getPhrasebookPartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'phrasebook',
      'phrasebook.html',
    );
    return res.sendFile(partialPath);
  }

  // ---------------- Read ----------------

  @Get('/list')
  async getPhrasebook(@Req() req: AuthenticatedRequest) {
    const user = await this.authService.getUserFromSession(req);
    return this.phrasebookService.getPhrasebook(user.clientId);
  }

  @Get('/:id')
  async getPhrase(@Param('id') id: string) {
    return this.phrasebookService.getPhrase(id);
  }

  // ---------------- Create ----------------

  @Post()
  async createPhrase(
    @Body() body: UpdatePhraseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.phrasebookService.createPhrase(req, body);
  }

  // ---------------- Update ----------------

  @Post('/:id')
  async updatePhrase(
    @Param('id') id: string,
    @Body() body: UpdatePhraseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.authService.getUserFromSession(req);
    return this.phrasebookService.updatePhrase(id, user.clientId, body);
  }

  // ---------------- Delete ----------------

  @Delete('/:id')
  async deletePhrase(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = await this.authService.getUserFromSession(req);
    return this.phrasebookService.deletePhrase(id, user.clientId);
  }

  // ---------------- Translation ----------------

  @Post('/:id/translate')
  async generateTranslation(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.authService.getUserFromSession(req);
    return this.phrasebookService.generateTranslation(id, user.clientId);
  }
}
