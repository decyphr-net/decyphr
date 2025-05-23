import { Controller, Get, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  /**
   * Serves the main layout HTML file with a dynamic content mount point.
   * The `{{PARTIAL_ROUTE}}` placeholder is replaced with the default partial route (/home).
   *
   * @param res - Express response object
   * @returns Rendered HTML with embedded partial route
   */
  @Get()
  async getLayout(@Res() res: Response): Promise<void> {
    try {
      const layoutPath = join(__dirname, '..', 'public', 'layout.html');
      this.logger.log(`Loading layout from ${layoutPath}`);

      let layoutHtml = await readFile(layoutPath, 'utf-8');
      layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/home');

      this.logger.log('Sending rendered layout with partial route');
      res.send(layoutHtml);
    } catch (error) {
      this.logger.error('Failed to load layout.html', error.stack);
      res.status(500).send('Error loading layout');
    }
  }

  /**
   * Serves the home page partial, injected into the layout at runtime via HTMX.
   *
   * @param res - Express response object
   * @returns Home page HTML partial
   */
  @Get('/home')
  async getHomePartial(@Res() res: Response): Promise<void> {
    const homePath = join(__dirname, '..', 'public', 'pages', 'home.html');
    this.logger.log(`Serving home partial from ${homePath}`);

    try {
      res.sendFile(homePath);
    } catch (error) {
      this.logger.error('Failed to send home.html', error.stack);
      res.status(500).send('Error loading home partial');
    }
  }
}
