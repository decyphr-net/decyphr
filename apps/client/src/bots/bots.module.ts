import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SettingsModule } from 'src/settings/settings.module';
import { BotsController } from './bots.controller';

@Module({
  imports: [HttpModule, SettingsModule],
  controllers: [BotsController],
})
export class BotsModule { }
