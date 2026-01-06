import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction } from 'src/interaction/interaction.entity';
import { InteractionModule } from 'src/interaction/interaction.module';
import { User, Word, WordForm } from './bank.entity';
import { BankService } from './bank.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Word, User, Interaction, WordForm]),
    InteractionModule,
  ],
  providers: [BankService],
  exports: [BankService],
})
export class BankModule { }
