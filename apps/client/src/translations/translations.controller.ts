
import { Body, Controller, Get, OnModuleInit, Param, Post, Req, Res, Sse } from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { TranslationDto } from './dtos/translation.dto';
import { TranslationsService } from './translations.service';

interface NormalizedTranslation {
  id: string;                // stable unique key, prefer translation.id, fallback to requestId
  originalText: string;
  translated: string;
  createdAt: string;
  language: string;
  sentences?: any[];         // token breakdown
  loading: boolean;          // true until translation is received
}

// @Controller('')
// export class TranslationsController implements OnModuleInit {

//   private readonly logger = new Logger(TranslationsController.name);
//   private readonly joinCache = new Map<string, any>();

//   constructor(
//     private readonly translationsService: TranslationsService,
//     private readonly httpService: HttpService,
//     private readonly authService: AuthService,
//     private readonly ktableService: KTableService) { }

//   async onModuleInit() {
//     await this.ktableService.watchTable('translation.response.table');
//     await this.ktableService.watchTable('nlp.complete');
//   }

//   /**
//    * Renders the full layout with the translation partial path injected.
//    */
//   @Get('/translations')
//   async getTranslationsPage(@Res() res: Response) {
//     const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
//     let layoutHtml = await readFile(layoutPath, 'utf-8');

//     layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/translations-partial');
//     return res.send(layoutHtml);
//   }

//   /**
//    * Returns the translations partial content to be injected into the layout.
//    */
//   @Get('/translations-partial')
//   async getTranslationsPagePartial(@Res() res: Response) {
//     const partialPath = join(
//       __dirname,
//       '..',
//       '..',
//       'public',
//       'pages',
//       'dashboard',
//       'translations',
//       'translations.html',
//     );
//     return res.sendFile(partialPath);
//   }

//   @Post('/translate')
//   async requestTranslation(@Body() dto: TranslationDto): Promise<{ status: string }> {

//     const requestId = dto.requestId ?? ulid();
//     const updatedDto = { ...dto, requestId };

//     await this.translationsService.emitTranslationRequest(updatedDto);
//     return { status: 'ok' };
//   }

//   private normalizePayload(raw: any): NormalizedTranslation {
//     const id = raw.id || raw.requestId || `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
//     const originalText = raw.originalText || raw.sentences?.map((s: any) => s.text).join(' ') || '';
//     const translated = raw.translated || '';
//     const createdAt = raw.createdAt || new Date().toISOString();
//     const language = raw.language || 'ga';
//     const sentences = raw.sentences || [];
//     const loading = translated === '';

//     return { id, originalText, translated, createdAt, language, sentences, loading };
//   }

//   @Sse('translations/events/:clientId')
//   sseTranslations(@Param('clientId') clientId: string): Observable<MessageEvent> {
//     this.logger.log(`📡 SSE connection opened for clientId=${clientId}`);

//     const subject = new Subject<MessageEvent>();

//     // ---- translation side (you can keep the clientId guard here – it does no harm)
//     this.ktableService.onUpdate('translation.response.table', (requestId, value) => {
//       const existing = this.joinCache.get(requestId) || {};
//       const updated = { ...existing, translation: value };
//       this.joinCache.set(requestId, updated);

//       const normalized = this.normalizePayload({ ...updated.translation, ...updated.nlp });

//       if (normalized) {
//         subject.next({ data: updated } as any);
//       }
//     });

//     // ---- NLP side – **remove the clientId guard**
//     this.ktableService.onUpdate('nlp.complete', (requestId, value) => {
//       const existing = this.joinCache.get(requestId) || {};
//       const updated = { ...existing, nlp: value };
//       this.joinCache.set(requestId, updated);

//       const normalized = this.normalizePayload({ ...updated.translation, ...updated.nlp });

//       if (normalized) {
//         subject.next({ data: updated } as any);
//       }
//     });

//     // (optional) keep‑alive ping, cleanup, etc.
//     return subject.asObservable();
//   }

//   @Get('translations/list')
//   async getClientTranslations(@Req() req: AuthenticatedRequest) {
//     const user = req.session?.user;

//     if (!user || !user.id) {
//       throw new UnauthorizedException('User not authenticated');
//     }

//     const clientId = await this.authService.getClientIdFromSession(req);

//     const response$ = this.httpService.get(
//       `http://translator:3009/translations/${clientId}`
//     );

//     const response = await lastValueFrom(response$);
//     return response.data;
//   }
// }


@Controller('')
export class TranslationsController implements OnModuleInit {
  constructor(
    private readonly translationsService: TranslationsService,
    private readonly authService: AuthService,
  ) { }

  async onModuleInit() {
    await this.translationsService.initKTableWatchers();
  }

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
  async requestTranslation(@Body() dto: TranslationDto) {
    return this.translationsService.submitTranslation(dto);
  }

  @Get('translations/list')
  async list(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.translationsService.getClientTranslations(clientId);
  }

  @Sse('translations/events/:clientId')
  sse(@Param('clientId') clientId: string) {
    return this.translationsService.getSSEStream(clientId);
  }
}