import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { CoursesController } from './courses.controller';
import { CoursesGatewayService } from './courses.service';

@Module({
  imports: [AuthModule],
  controllers: [CoursesController],
  providers: [CoursesGatewayService],
})
export class CoursesModule {}
