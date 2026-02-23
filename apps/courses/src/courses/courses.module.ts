import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseLexiconEvent, CourseProgress } from './courses.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CoursesKafkaService } from './courses.kafka.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseProgress, CourseLexiconEvent])],
  controllers: [CoursesController],
  providers: [CoursesService, CoursesKafkaService],
})
export class CoursesModule {}
