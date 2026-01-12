import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankModule } from 'src/bank/bank.module';
import { InteractionModule } from 'src/interaction/interaction.module';
import { StatementController } from './statement.controller';
import { Statement, StatementToken } from './statement.entity';
import { StatementService } from './statement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statement, StatementToken]),
    BankModule,
    InteractionModule,
  ],
  exports: [StatementService],
  providers: [StatementService],
  controllers: [StatementController],
})
export class StatementModule { }
