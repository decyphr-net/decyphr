import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { CommonModule } from 'src/common/common.module';
import { Interaction, UserWordStatistics } from 'src/interaction/interaction.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { LexiconController } from './lexicon.controller';
import { LexiconIngestService } from './lexicon.ingest.service';
import { RedisProfileService } from './profile.service';

@Module({
  imports: [
    CommonModule,
    // Provide repositories for the entities used by the ingest flow.
    TypeOrmModule.forFeature([Word, User, Interaction, UserWordStatistics]),
  ],
  controllers: [LexiconController],
  providers: [LexiconIngestService, RedisProfileService, InteractionService],
  exports: [],
})
export class LexiconModule { }