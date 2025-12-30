import { Body, Controller, Get, Logger, OnModuleInit, Param, Post, Req, Res, Sse } from '@nestjs/common';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Observable, Subject, filter, map } from 'rxjs';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { TranslationsService } from 'src/translations/translations.service';
import { KafkaService } from 'src/utils/kafka/kafka.service';

const vaultEvents$ = new Subject<any>();

@Controller('vault')
export class VaultController implements OnModuleInit {
  private readonly logger = new Logger(VaultController.name);

  constructor(
    private readonly translationService: TranslationsService,
    private readonly authService: AuthService,
    private readonly kafka: KafkaService
  ) { }

  async onModuleInit() {
    await this.kafka.consume(
      ['vault.attempt.updated'],
      'vault-client-group',
      async (payload) => {
        console.log(payload)
        const messageValue = payload.message.value?.toString() ?? '{}';
        console.log(messageValue)
        const parsed = JSON.parse(messageValue);
        console.log(parsed)
        await this.handleKafkaUpdate(parsed);
      },
    );

    this.logger.log('Subscribed to Kafka topics chat.started, chat.bot.response');
  }

  /**
   * Renders the full layout with the vault partial injected.
   * Route: /vault
   */
  @Get()
  async getVaultPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    // Inject the vault partial route
    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/vault/partial');
    return res.send(layoutHtml);
  }

  /**
   * Returns the partial HTML for the translation vault page.
   * Route: /vault/partial
   */
  @Get('partial')
  async getVaultPartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'vault',
      'vault.html',
    );
    return res.sendFile(partialPath);
  }

  @Post()
  async createVault(@Body() body: any, @Req() req: any) {
    const { text, lang } = body;

    const vaultId = await this.translationService.createVault(
      text,
      lang,
      await this.authService.getClientIdFromSession(req));
    return { vaultId };
  }

  normaliseAttempts(text: string, attempts: any[]) {
    const annotations: {
      start: number;
      end: number;
      status: 'correct' | 'missing';
      note?: string;
    }[] = [];

    const claimed = new Set<number>();

    for (const attempt of attempts) {
      const evaln = attempt.evaluation;
      if (!evaln) continue;

      // Correct chunks
      for (const chunk of evaln.chunks ?? []) {
        const idx = text.indexOf(chunk.original);
        if (idx === -1) continue;

        for (let i = idx; i < idx + chunk.original.length; i++) {
          if (claimed.has(i)) continue;
          claimed.add(i);
        }

        annotations.push({
          start: idx,
          end: idx + chunk.original.length,
          status: 'correct',
          note: chunk.meaning,
        });
      }
    }

    // Second pass: missing chunks (lower priority)
    for (const attempt of attempts) {
      const evaln = attempt.evaluation;
      if (!evaln) continue;

      for (const chunk of evaln.missing_chunks ?? []) {
        const idx = text.indexOf(chunk.original);
        if (idx === -1) continue;

        let overlaps = false;
        for (let i = idx; i < idx + chunk.original.length; i++) {
          if (claimed.has(i)) {
            overlaps = true;
            break;
          }
        }

        if (overlaps) continue;

        annotations.push({
          start: idx,
          end: idx + chunk.original.length,
          status: 'missing',
          note: chunk.reason,
        });
      }
    }

    return annotations.sort((a, b) => a.start - b.start);
  }

  @Get('list')
  async listVaultEntries(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    if (!clientId) return [];

    const entries = await this.translationService.getVaultList(clientId);

    return entries.map(e => {
      const annotations = this.normaliseAttempts(e.text, e.attempts ?? []);;

      console.log(annotations)

      return {
        id: e.id,
        text: e.text,
        lang: e.lang,
        createdAt: e.createdAt,
        solved: annotations.every(a => a.status === 'correct'),
        annotations
      };
    });
  }

  @Post('/:id/guess')
  async submitGuess(
    @Param('id') vaultId: string,
    @Body() body: { guess: string, original: string }
  ) {
    await this.kafka.emit('vault.guess.submitted', {
      vaultId,
      guess: body.guess,
      clientId: 'fa902138-7f75-4af4-aff7-a4b3d401ad4d',
      targetLanguage: 'ga',
      original: body.original
    });

    return { vaultId };
  }

  handleKafkaUpdate(msg: any) {
    vaultEvents$.next(msg);
  }

  @Sse('events/:clientId')
  vaultEvents(@Param('clientId') clientId: string): Observable<MessageEvent> {
    this.logger.log(`📡 Vault SSE connected clientId=${clientId}`);

    return vaultEvents$.pipe(
      filter(event => event.clientId === clientId),
      map(event => ({
        data: event
      }) as MessageEvent)
    );
  }
}