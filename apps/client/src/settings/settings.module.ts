import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguageSetting } from './entities/LanguageSetting';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([LanguageSetting])],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule { }
