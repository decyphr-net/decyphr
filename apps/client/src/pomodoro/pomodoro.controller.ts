import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';

@Controller('pomodoro')
export class PomodoroController {
  @Get()
  async getPomodoroPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    // Inject the pomodoro partial route
    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/pomodoro/partial');
    return res.send(layoutHtml);
  }

  /**
   * Returns the partial HTML for the pomodoro page.
   * Route: /pomodoro/partial
   */
  @Get('partial')
  async getPomodoroPartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'pomodoro',
      'pomodoro.html',
    );
    return res.sendFile(partialPath);
  }
}
