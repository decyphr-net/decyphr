import { readFile } from 'fs/promises';
import { join } from 'path';

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  OnModuleInit,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { EachMessagePayload, Kafka } from 'kafkajs';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { LexiconService } from './lexicon.service';

export class UpdateStatementDto {
  text?: string;
  translation?: string;
  pronunciation?: string;
  notes?: string;

  autoTranslate?: boolean;

  interaction?: {
    type: string;
    timestamp?: number;
  };
}

@Controller('')
export class LexiconController implements OnModuleInit {
  private readonly logger = new Logger(LexiconController.name);
  private kafka: Kafka;
  private consumer: any;
  private sseClients: Response[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly lexiconService: LexiconService,
  ) {
    this.kafka = new Kafka({
      clientId: 'lexicon-service',
      brokers: ['kafka:9092'], // adjust as needed
    });
    this.consumer = this.kafka.consumer({ groupId: 'lexicon-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'statement.created',
      fromBeginning: false,
    });
    await this.consumer.subscribe({
      topic: 'statement.updated',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        if (!message.value) return;

        try {
          const payload = JSON.parse(message.value.toString());
          this.logger.log(`Received message from ${topic}: ${payload.id}`);

          // Prepare SSE payload
          const data = JSON.stringify({
            id: payload.id,
            text: payload.text,
            translation: payload.translation,
            pronunciation: payload.pronunciation,
            notes: payload.notes,
          });

          // Broadcast to SSE clients
          this.sseClients.forEach((client) =>
            client.write(`data: ${data}\n\n`),
          );
        } catch (err) {
          this.logger.error('Failed to process Kafka message', err);
        }
      },
    });
  }

  @Get('/lexicon/statements/stream')
  async streamStatements(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send a ping to keep connection alive every 15s
    const keepAlive = setInterval(() => res.write(':\n\n'), 15000);

    // Add client to list
    this.sseClients.push(res);

    // Remove client when connection closes
    res.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients = this.sseClients.filter((c) => c !== res);
    });
  }

  /**
   * Renders the full layout with the lexicon partial path injected.
   */
  @Get('/lexicon/statements')
  async getStatmentsPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace(
      '{{PARTIAL_ROUTE}}',
      '/lexicon-statements-partial',
    );
    return res.send(layoutHtml);
  }

  /**
   * Returns the lexicon partial content to be injected into the layout.
   */
  @Get('/lexicon-statements-partial')
  async getLexionStatementsPagePartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'lexicon',
      'statements.html',
    );
    return res.sendFile(partialPath);
  }

  /**
   * Renders the full layout with the lexicon partial path injected.
   */
  @Get('/lexicon')
  async getLexiconPage(@Res() res: Response) {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    let layoutHtml = await readFile(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace('{{PARTIAL_ROUTE}}', '/lexicon-partial');
    return res.send(layoutHtml);
  }

  /**
   * Returns the lexicon partial content to be injected into the layout.
   */
  @Get('/lexicon-partial')
  async getLexionPagePartial(@Res() res: Response) {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      'dashboard',
      'lexicon',
      'lexicon.html',
    );
    return res.sendFile(partialPath);
  }

  /**
   * Returns snapshot data as JSON.
   */
  @Get('/snapshot/:clientId')
  async getSnapshot(@Param('clientId') clientId: string, @Res() res: Response) {
    const user = await this.authService.findUserByClientId(clientId);
    try {
      // Call your existing endpoint (assuming same server)
      const response = await fetch(
        `http://lexicon:3010/snapshot/${clientId}/${user.languageSettings?.[0]?.targetLanguage}`,
      );
      const data = await response.json();

      return res.json(data);
    } catch (err) {
      this.logger.error(`Failed to fetch snapshot ${clientId}`, err);
      return res.status(500).json({ error: 'Failed to fetch snapshot data' });
    }
  }

  @Get('/lexicon/user')
  async getUserLexicon(@Req() req: AuthenticatedRequest) {
    const user = await this.authService.getUserFromSession(req);
    return this.lexiconService.getUserLexicon(
      user.clientId,
      user.languageSettings?.[0]?.targetLanguage,
    );
  }

  @Post('/lexicon/import')
  async importLexicon(
    @Body() body: { words: string[] },
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const user = await this.authService.getUserFromSession(req);

    if (!body.words?.length) {
      return res.status(400).json({ error: 'No words provided' });
    }

    const interaction = {
      type: 'lexicon_import',
      timestamp: new Date().toISOString(),
    };

    try {
      await this.lexiconService.importWords({
        clientId: user.clientId,
        targetLanguage: user.languageSettings?.[0]?.targetLanguage,
        words: body.words,
        interaction,
      });

      return res.status(202).json({ ok: true });
    } catch (err) {
      this.logger.error('Lexicon import failed', err);
      return res.status(500).json({ error: 'Import failed' });
    }
  }

  @Get('/lexicon/statements/data')
  async getStatementsData(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const user = await this.authService.getUserFromSession(req);

    // Hardcoded demo data
    try {
      // Call your existing endpoint (assuming same server)
      const response = await fetch(
        `http://lexicon:3010/lexicon/statements/${user.clientId}/${user.languageSettings?.[0]?.targetLanguage}`,
      );
      const data = await response.json();

      return res.json(data);
    } catch (err) {
      // this.logger.error(`Failed to fetch snapshot ${clientId}`, err);
      return res.status(500).json({ error: 'Failed to fetch snapshot data' });
    }
  }

  /**
   * Deletes a statement by ID by calling the StatementController endpoint
   */
  @Delete('/lexicon/statements/:id')
  async deleteStatement(@Param('id') id: string, @Res() res: Response) {
    try {
      // Call the statement service endpoint (same server)
      const response = await fetch(
        `http://lexicon:3010/lexicon/statements/${id}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json(errorData);
      }

      return res.json({ success: true });
    } catch (err) {
      this.logger.error(`Failed to delete statement ${id}`, err);
      return res.status(500).json({ error: 'Failed to delete statement' });
    }
  }

  @Post('/lexicon/statements')
  async createStatement(
    @Body() body: UpdateStatementDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const user = await this.authService.getUserFromSession(req);

    try {
      await this.lexiconService.handleStatementEvent({
        clientId: user.clientId,
        changes: {
          text: body.text,
          translation: body.translation,
          pronunciation: body.pronunciation,
          notes: body.notes,
        },
        interaction: {
          type: 'statement_created',
          timestamp: Date.now(),
        },
        autoTranslate: body.autoTranslate,
      });

      return res.json({ ok: true });
    } catch (err) {
      this.logger.error('Failed to create statement', err);
      return res.status(500).json({ error: 'Create failed' });
    }
  }

  @Post('/lexicon/statements/:id/edit')
  async editStatement(
    @Param('id') id: string,
    @Body() body: UpdateStatementDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const user = await this.authService.getUserFromSession(req);

    console.log(id);

    try {
      await this.lexiconService.handleStatementEvent({
        statementId: id,
        clientId: user.clientId,
        changes: {
          text: body.text,
          translation: body.translation,
          pronunciation: body.pronunciation,
          notes: body.notes,
        },
        interaction: {
          type: 'text_updated',
          timestamp: Date.now(),
        },
        autoTranslate: body.autoTranslate,
      });

      return res.json({ ok: true });
    } catch (err) {
      this.logger.error(`Failed to edit statement ${id}`, err);
      return res.status(500).json({ error: 'Edit failed' });
    }
  }
}
