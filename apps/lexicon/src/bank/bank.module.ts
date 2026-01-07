import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction } from 'src/interaction/interaction.entity';
import { InteractionModule } from 'src/interaction/interaction.module';
import { User, Word, WordForm } from './bank.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Word, User, Interaction, WordForm]),
    InteractionModule,
  ],
  providers: [],
  exports: [],
})
export class BankModule { }
