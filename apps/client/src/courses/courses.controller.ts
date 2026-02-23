import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { CoursesGatewayService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly authService: AuthService,
    private readonly coursesService: CoursesGatewayService,
  ) {}

  @Get('catalog')
  async getCatalog(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.get('/courses/catalog', clientId);
  }

  @Get(':courseSlug/lessons/:lessonSlug')
  async getLesson(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.get(`/courses/${courseSlug}/lessons/${lessonSlug}`, clientId);
  }

  @Post(':courseSlug/lessons/:lessonSlug/progress')
  async updateProgress(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: any,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.post(`/courses/${courseSlug}/lessons/${lessonSlug}/progress`, clientId, body);
  }

  @Post(':courseSlug/lessons/:lessonSlug/lexicon-exposure')
  async recordExposure(
    @Req() req: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: any,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.coursesService.post(
      `/courses/${courseSlug}/lessons/${lessonSlug}/lexicon-exposure`,
      clientId,
      body,
    );
  }
}
