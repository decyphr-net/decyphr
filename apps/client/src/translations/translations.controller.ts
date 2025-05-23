import { Body, Controller, Get, Logger, OnModuleInit, Param, Post, Res, Sse } from '@nestjs/common';
import { Response } from 'express';
import { Observable, Subject } from 'rxjs';

import { readFile } from 'fs/promises';
import { join } from 'path';
import { KTableService } from 'src/utils/kafka/ktable.service';
import { TranslationDto } from './dtos/translation.dto';
import { TranslationsService } from './translations.service';

@Controller('')
export class TranslationsController implements OnModuleInit {

  private readonly logger = new Logger(TranslationsController.name);

  constructor(
    private readonly translationsService: TranslationsService,
    private readonly ktableService: KTableService) { }

  async onModuleInit() {
    await this.ktableService.watchTable('translation.response.table');
  }

  /**
   * Renders the full layout with the translation partial path injected.
   */
  @Get('/translations')
  async getTranslationsPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/translations-partial');
    return res.send(layoutHtml);
  }

  /**
   * Returns the translations partial content to be injected into the layout.
   */
  @Get('/translations-partial')
  async getTranslationsPagePartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'translations',
      'translations.html',
    );
    return res.sendFile(partialPath);
  }

  @Post('/translate')
  async requestTranslation(@Body() dto: TranslationDto): Promise<{ status: string }> {
    await this.translationsService.emitTranslationRequest(dto);
    return { status: 'ok' };
  }

  @Sse('translations/:clientId')
  sseTranslations(@Param('clientId') clientId: string): Observable<MessageEvent> {
    this.logger.log(`📡 SSE connection opened for clientId=${clientId}`);
    const subject = new Subject<MessageEvent>();

    this.ktableService.onUpdate('translation.response.table', (key, value) => {
      const [id, source, target] = key.split('|');
      if (id === clientId) {
        subject.next({ data: value } as any);
      }
    });

    return subject.asObservable();
  }
}


