import { Module } from '@nestjs/common';
import { I18nController } from './i18n.controller';

@Module({
  controllers: [I18nController]
})
export class I18nModule {}
