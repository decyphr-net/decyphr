import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { AuthService } from 'src/auth/auth.service';
import { PracticeGatewayService } from './practice.service';

@Controller('practice')
export class PracticeController {
  constructor(
    private readonly authService: AuthService,
    private readonly practiceService: PracticeGatewayService,
  ) {}

  @Get('due')
  async getDue(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.practiceService.get('/practice/due', clientId, query);
  }

  @Post('attempt')
  async submitAttempt(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.practiceService.post('/practice/attempt', clientId, body);
  }

  @Get('mistakes')
  async getMistakes(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.practiceService.get('/practice/mistakes', clientId, query);
  }

  @Get('progress')
  async getProgress(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.practiceService.get('/practice/progress', clientId, query);
  }

  @Get('history')
  async getHistory(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.practiceService.get('/practice/history', clientId, query);
  }

  @Post('profiles/reset')
  async resetProfiles(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.practiceService.post('/practice/profiles/reset', clientId, body);
  }
}
