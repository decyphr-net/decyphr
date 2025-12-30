/*
https://docs.nestjs.com/controllers#controllers
*/

import { Body, Controller, Get, Inject, Post, Query, Res } from '@nestjs/common';
import { ClientKafka, MessagePattern } from '@nestjs/microservices';
import { Response } from 'express';
import { VaultsService } from './vaults.service';

@Controller('vault')
export class VaultsController {
  constructor(
    private readonly vaultsService: VaultsService,
    @Inject('TRANSLATION') private readonly client: ClientKafka
  ) { }

  @Post('/create')
  async createVault(
    @Body() body: { clientId: string; text: string; lang: string, guess: string },
    @Res() res: Response,
  ) {
    try {
      if (!body.clientId) {
        return res.status(401).json({ error: 'Missing client ID' });
      }

      const entry = await this.vaultsService.createVaultEntry(
        body.clientId,
        body.text,
        body.lang,
      );

      return res.json({ vaultId: entry.id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create vault entry' });
    }
  }

  // Get vault entries for a client
  @Get('list')
  async listVaultEntries(@Query('clientId') clientId: string) {
    if (!clientId) throw new Error('Missing clientId');
    return this.vaultsService.getVaultEntries(clientId);
  }

  @MessagePattern('vault.guess.submitted')
  async translateText(msg: any) {
    const attempt = await this.vaultsService.addAttempt(
      msg.vaultId,
      msg.clientId,
      msg.guess,
      msg.targetLanguage);
    await this.client.emit('ai.guess.check', {
      ...msg,
      attemptId: attempt.id,
      normalizedGuess: msg.guess.trim().toLowerCase()
    });
  }

  @MessagePattern('vault.guess.evaluated')
  async handleGuessEvaluated(msg: any) {
    console.log(msg)
    await this.vaultsService.attachEvaluation(
      msg.attemptId,
      msg.evaluation
    );
  }
}
