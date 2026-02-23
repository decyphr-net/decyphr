import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { FocusController } from './focus.controller';
import { FocusGatewayService } from './focus.service';

@Module({
  imports: [AuthModule],
  controllers: [FocusController],
  providers: [FocusGatewayService],
})
export class FocusModule {}
