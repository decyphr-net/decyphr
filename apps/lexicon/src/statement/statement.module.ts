import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankModule } from 'src/bank/bank.module';
import { InteractionModule } from 'src/interaction/interaction.module';
import { Statement } from './statement.entity';
import { StatementService } from './statement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statement]),
    BankModule,
    InteractionModule,
  ],
  exports: [StatementService],
  providers: [StatementService],
})
export class StatementModule { }
