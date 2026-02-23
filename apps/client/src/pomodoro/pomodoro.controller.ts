import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('pomodoro')
export class PomodoroController {
  @Get()
  async getPomodoroPage(@Res() res: Response) {
    return res.json({
      deprecated: true,
      message: 'Pomodoro page has moved to the Focus & Goals experience in the web app.',
    });
  }

  /**
   * Returns the partial HTML for the pomodoro page.
   * Route: /pomodoro/partial
   */
  @Get('partial')
  async getPomodoroPartial(@Res() res: Response) {
    return res.status(410).json({
      deprecated: true,
      message: 'Pomodoro partial is no longer served. Use the Focus widget in the web app.',
    });
  }
}
