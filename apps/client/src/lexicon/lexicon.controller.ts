import { readFile } from 'fs/promises';
import { join } from 'path';

import { Controller, Get, Logger, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
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
      console.log(data);

      return res.json(data);
    } catch (err) {
      this.logger.error(`Failed to fetch snapshot ${clientId}`, err);
      return res.status(500).json({ error: 'Failed to fetch snapshot data' });
    }
  }

  @Get('/lexicon/user')
  async getUserLexicon() {
    return this.lexiconService.getUserLexicon('fa902138-7f75-4af4-aff7-a4b3d401ad4d', 'ga');
  }
}

