/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Delete, Get, Param, ParseIntPipe } from '@nestjs/common';
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
}
