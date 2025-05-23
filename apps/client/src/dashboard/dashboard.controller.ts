import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';

@Controller()
export class DashboardController {
  /**
   * Renders the full layout with the dashboard partial path injected.
   */
  @Get('/dashboard')
  async getDashboard(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/dashboard-partial');
    return res.send(layoutHtml);
  }

  /**
   * Returns the dashboard partial content to be injected into the layout.
   */
  @Get('/dashboard-partial')
  async getDashboardPartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'dashboard.html',
    );
    return res.sendFile(partialPath);
  }
}
