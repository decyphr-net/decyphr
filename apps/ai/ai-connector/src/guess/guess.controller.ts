/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GuessService } from './guess.service';

@Controller()
export class GuessController {
  private readonly logger = new Logger(GuessController.name);

  constructor(private readonly service: GuessService) { }

  @MessagePattern('ai.guess.check')
  async handleChatMessage(payload: any) {
    this.logger.log(
      `📥 Received ChatMessagePayload: ${JSON.stringify(payload)}`,
    );

    await this.service.guess(payload);
  }
}
