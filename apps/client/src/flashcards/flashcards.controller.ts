/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';

@Controller('flashcards')
export class FlashcardsController {
  @Get()
  async getFlashcardsPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    // Inject the flashcards partial route
    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/flashcards/partial');
    return res.send(layoutHtml);
  }

  /**
   * Returns the partial HTML for the flashcards page.
   * Route: /flashcards/partial
   */
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

  /**
   * Study mode page
   * Route: /flashcards/study
   */
  @Get('study')
  async getStudyPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace(
      '{{PARTIAL_ROUTE}}',
      '/flashcards/study/partial',
    );

    return res.send(layoutHtml);
  }

  /**
   * Partial for study mode
   * Route: /flashcards/study/partial
   */
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
  async getDecks(@Res() res: Response) {
    const decks = [
      {
        id: 1,
        name: "Everyday Irish",
        description: "Common phrases and expressions",
        language: "ga",
        cardCount: 42,
        dueCount: 8
      },
      {
        id: 2,
        name: "Verbs",
        description: "Irregular and common verbs",
        language: "ga",
        cardCount: 30,
        dueCount: 0
      },
      {
        id: 3,
        name: "Adjectives",
        description: "Descriptors and qualities",
        language: "ga",
        cardCount: 18,
        dueCount: 4
      }
    ];

    return res.json(decks);
  }
}
