import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { SettingsModule } from 'src/settings/settings.module';
import { BotsController } from './bots.controller';

@Module({
  imports: [HttpModule, SettingsModule, AuthModule],
  controllers: [BotsController],
})
export class BotsModule { }
