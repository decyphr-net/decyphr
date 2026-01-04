import { readFile } from 'fs/promises';
import { join } from 'path';

import { Body, Controller, Get, Logger, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { LexiconService } from './lexicon.service';


@Controller('')
export class LexiconController {

  private readonly logger = new Logger(LexiconController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly lexiconService: LexiconService
  ) { }

  /**
   * Renders the full layout with the lexicon partial path injected.
   */
  @Get('/lexicon')
  async getLexiconPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/lexicon-partial');
    return res.send(layoutHtml);
  }

  /**
   * Returns the lexicon partial content to be injected into the layout.
   */
  @Get('/lexicon-partial')
  async getLexionPagePartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'lexicon',
      'lexicon.html',
    );
    return res.sendFile(partialPath);
  }

  /**
   * Returns snapshot data as JSON.
   */
  @Get('/snapshot/:clientId')
  async getSnapshot(@Param('clientId') clientId: string, @Res() res: Response) {
    const user = await this.authService.findUserByClientId(clientId);
    try {
      // Call your existing endpoint (assuming same server)
      const response = await fetch(`http://lexicon:3010/snapshot/${clientId}/${user.languageSettings?.[0]?.targetLanguage}`);
      const data = await response.json();

      return res.json(data);
    } catch (err) {
      this.logger.error(`Failed to fetch snapshot ${clientId}`, err);
      return res.status(500).json({ error: 'Failed to fetch snapshot data' });
    }
  }

  @Get('/lexicon/user')
  async getUserLexicon(@Req() req: Request) {
    const user = await this.authService.getUserFromSession(req);
    return this.lexiconService.getUserLexicon(
      user.clientId,
      user.languageSettings?.[0]?.targetLanguage
    );
  }

  @Post('/lexicon/import')
  async importLexicon(
    @Body() body: { words: string[] },
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const user = await this.authService.getUserFromSession(req);

    if (!body.words?.length) {
      return res.status(400).json({ error: 'No words provided' });
    }

    const interaction = {
      type: 'lexicon_import',
      timestamp: new Date().toISOString(),
    };

    try {
      await this.lexiconService.importWords({
        clientId: user.clientId,
        targetLanguage: user.languageSettings?.[0]?.targetLanguage,
        words: body.words,
        interaction,
      });

      return res.status(202).json({ ok: true });
    } catch (err) {
      this.logger.error('Lexicon import failed', err);
      return res.status(500).json({ error: 'Import failed' });
    }
  }

}

