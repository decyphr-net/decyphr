import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CourseGlossLookupDto, CourseLexiconExposureDto, CourseProgressUpdateDto } from './courses.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  private requireClientId(clientId: string) {
    if (!clientId) {
      throw new BadRequestException('Missing clientId');
    }
    return clientId;
  }

  @Get('catalog')
  getCatalog(@Query('clientId') clientId: string) {
    return this.coursesService.getCatalog(this.requireClientId(clientId));
  }

  @Get(':courseSlug/lessons/:lessonSlug')
  getLesson(
    @Query('clientId') clientId: string,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.coursesService.getLesson(this.requireClientId(clientId), courseSlug, lessonSlug);
  }

  @Post(':courseSlug/lessons/:lessonSlug/progress')
  updateProgress(
    @Query('clientId') clientId: string,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: CourseProgressUpdateDto,
  ) {
    return this.coursesService.updateProgress(this.requireClientId(clientId), courseSlug, lessonSlug, body);
  }

  @Post(':courseSlug/lessons/:lessonSlug/lexicon-exposure')
  recordLexiconExposure(
    @Query('clientId') clientId: string,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: CourseLexiconExposureDto,
  ) {
    return this.coursesService.recordLexiconExposure(
      this.requireClientId(clientId),
      courseSlug,
      lessonSlug,
      body,
    );
  }

  @Post(':courseSlug/lessons/:lessonSlug/gloss')
  lookupGloss(
    @Query('clientId') clientId: string,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: CourseGlossLookupDto,
  ) {
    return this.coursesService.lookupGloss(this.requireClientId(clientId), courseSlug, lessonSlug, body);
  }
}
