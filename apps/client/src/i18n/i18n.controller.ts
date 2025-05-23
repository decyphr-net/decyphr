import { Controller, Get, Logger, Query } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller('i18n')
export class I18nController {
  private readonly logger = new Logger(I18nController.name);

  @Get()
  getTranslation(@Query('lang') lang = 'en') {
    const isDev = process.env.NODE_ENV !== 'production';
    const baseDir = isDev ? path.join(process.cwd(), 'src') : __dirname;
    const filePath = path.join(baseDir, 'locales', `${lang}.json`);

    this.logger.log(`Looking for translation file at: ${filePath}`);

    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    this.logger.warn(`Translation file not found: ${filePath}`);
    return {};
  }
}