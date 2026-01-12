import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Word, WordForm } from 'src/bank/bank.entity';
import { WordScoringService } from 'src/lexicon/scoring.service';
import { Interaction, UserWordStatistics } from './interaction.entity';
import { InteractionGateway } from './interaction.gateway';
import { InteractionService } from './interaction.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Interaction,
      Word,
      User,
      UserWordStatistics,
      WordForm,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => InteractionModule),
  ],
  providers: [InteractionService, InteractionGateway, WordScoringService],
  exports: [InteractionService],
})
export class InteractionModule { }
