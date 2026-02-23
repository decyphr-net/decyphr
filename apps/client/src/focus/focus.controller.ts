import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { AuthService } from 'src/auth/auth.service';
import { FocusGatewayService } from './focus.service';

@Controller('')
export class FocusController {
  constructor(
    private readonly authService: AuthService,
    private readonly focusService: FocusGatewayService,
  ) {}

  @Post('/focus/sessions')
  async createSession(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post('/focus/sessions', clientId, body);
  }

  @Get('/focus/sessions/active')
  async activeSession(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.get('/focus/sessions/active', clientId);
  }

  @Post('/focus/sessions/:id/pause')
  async pause(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post(`/focus/sessions/${id}/pause`, clientId);
  }

  @Post('/focus/sessions/:id/resume')
  async resume(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post(`/focus/sessions/${id}/resume`, clientId);
  }

  @Post('/focus/sessions/:id/adjust')
  async adjust(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post(`/focus/sessions/${id}/adjust`, clientId, body);
  }

  @Post('/focus/sessions/:id/complete')
  async complete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post(`/focus/sessions/${id}/complete`, clientId);
  }

  @Post('/focus/sessions/:id/cancel')
  async cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post(`/focus/sessions/${id}/cancel`, clientId);
  }

  @Get('/focus/sessions/history')
  async history(@Req() req: AuthenticatedRequest, @Query() query: Record<string, string | undefined>) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.get('/focus/sessions/history', clientId, query);
  }

  @Post('/goals')
  async createGoal(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post('/goals', clientId, body);
  }

  @Get('/goals')
  async listGoals(@Req() req: AuthenticatedRequest, @Query() query: Record<string, string | undefined>) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.get('/goals', clientId, query);
  }

  @Get('/goals/progress/summary')
  async summary(@Req() req: AuthenticatedRequest, @Query() query: Record<string, string | undefined>) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.get('/goals/progress/summary', clientId, query);
  }

  @Get('/goals/:id')
  async getGoal(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.get(`/goals/${id}`, clientId);
  }

  @Patch('/goals/:id')
  async patchGoal(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.patch(`/goals/${id}`, clientId, body);
  }

  @Post('/goals/:id/archive')
  async archiveGoal(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post(`/goals/${id}/archive`, clientId);
  }

  @Post('/goals/:id/checkoff')
  async checkoff(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.post(`/goals/${id}/checkoff`, clientId, body);
  }

  @Get('/goals/:id/progress')
  async goalProgress(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.focusService.get(`/goals/${id}/progress`, clientId);
  }
}
