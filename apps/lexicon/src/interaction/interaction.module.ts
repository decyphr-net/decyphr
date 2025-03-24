import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Word } from 'src/bank/bank.entity';
import { Interaction, UserWordStatistics } from './interaction.entity';
import { InteractionGateway } from './interaction.gateway';
import { InteractionService } from './interaction.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interaction, Word, User, UserWordStatistics]),
    ScheduleModule.forRoot(),
    forwardRef(() => InteractionModule),
  ],
  providers: [InteractionService, InteractionGateway],
  exports: [InteractionService],
})
export class InteractionModule { }
