/*
https://docs.nestjs.com/providers#services
*/

import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { GroqProvider } from 'src/providers/groq.provider';

@Injectable()
export class GuessService {

  constructor(
    private readonly groqProvider: GroqProvider,
    @Inject('TRANSLATION') private readonly client: ClientKafka
  ) { }

  async guess(payload: any) {
    const evaluation = await this.groqProvider.vaultTranslationGuess(payload);

    await this.client.emit('vault.guess.evaluated', {
      attemptId: payload.attemptId,
      vaultId: payload.vaultId,
      clientId: payload.clientId,
      evaluation,
    });
  }
}
