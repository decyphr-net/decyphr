import { Controller, Get, Param, Patch, Query, Body } from '@nestjs/common';
import { UpdateChallengeDto } from './challenges.dto';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  listChallenges(@Query('clientId') clientId: string) {
    return this.challengesService.listForClient(clientId);
  }

  @Patch(':id')
  patchChallenge(
    @Query('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChallengeDto,
  ) {
    return this.challengesService.setCompletion(clientId, id, dto.completed);
  }
}
