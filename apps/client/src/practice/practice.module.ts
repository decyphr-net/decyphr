import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PracticeController } from './practice.controller';
import { PracticeGatewayService } from './practice.service';

@Module({
  imports: [AuthModule],
  controllers: [PracticeController],
  providers: [PracticeGatewayService],
})
export class PracticeModule {}
