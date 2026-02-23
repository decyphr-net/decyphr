import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  DuePracticeQueryDto,
  PracticeMistakesQueryDto,
  PracticeHistoryQueryDto,
  PracticeProgressQueryDto,
  ResetProfilesDto,
  SubmitPracticeAttemptDto,
} from './practice.dto';
import { PracticeService } from './practice.service';

@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('due')
  getDue(@Query('clientId') clientId: string, @Query() query: DuePracticeQueryDto) {
    return this.practiceService.getDue(clientId, query);
  }

  @Post('attempt')
  submitAttempt(
    @Query('clientId') clientId: string,
    @Body() body: SubmitPracticeAttemptDto,
  ) {
    return this.practiceService.submitAttempt(clientId, body);
  }

  @Get('mistakes')
  getMistakes(
    @Query('clientId') clientId: string,
    @Query() query: PracticeMistakesQueryDto,
  ) {
    return this.practiceService.getRecentMistakes(clientId, query);
  }

  @Get('progress')
  getProgress(@Query('clientId') clientId: string, @Query() query: PracticeProgressQueryDto) {
    return this.practiceService.getProgress(clientId, query);
  }

  @Get('history')
  getHistory(@Query('clientId') clientId: string, @Query() query: PracticeHistoryQueryDto) {
    return this.practiceService.getHistory(clientId, query);
  }

  @Post('profiles/reset')
  resetProfiles(@Query('clientId') clientId: string, @Body() body: ResetProfilesDto) {
    return this.practiceService.resetProfiles(clientId, body);
  }
}
