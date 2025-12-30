import { Controller, Get, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

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
