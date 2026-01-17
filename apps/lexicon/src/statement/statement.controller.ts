/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Delete, Get, Param, ParseIntPipe } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { StatementService } from './statement.service';

@Controller('/lexicon')
export class StatementController {
  constructor(private readonly service: StatementService) { }
  @Get('/statements/:clientId/:language')
  async getStatementsData(
    @Param('clientId') clientId: string,
    @Param('language') language: string,
  ) {
    return await this.service.getUserStatements(clientId, language);
  }

  @Delete('/statements/:id')
  async deleteStatement(@Param('id', ParseIntPipe) id: number) {
    await this.service.deleteStatementById(id);
    return { success: true };
  }

  @EventPattern('translation.complete')
  async handleTranslationComplete(@Payload() event: any) {
    // Ignore translations not tied to a statement
    if (!event.requestId) {
      return;
    }

    await this.service.updateTranslation(event);
  }
}
