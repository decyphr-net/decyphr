import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly authService: AuthService,
    private readonly challengesService: ChallengesService,
  ) {}

  @Get()
  async listChallenges(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.challengesService.get('/challenges', clientId);
  }

  @Patch(':id')
  async patchChallenge(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.challengesService.patch(`/challenges/${id}`, clientId, body);
  }
}
