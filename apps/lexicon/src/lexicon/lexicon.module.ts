import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { CefrAssessmentService } from 'src/cefr/cefr.service';
import { CommonModule } from 'src/common/common.module';
import { Interaction, UserWordStatistics } from 'src/interaction/interaction.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { LexiconIngestService } from './ingest/lexicon.ingest.service';
import { LexiconController } from './lexicon.controller';
import { RedisProfileService } from './profile.service';
import { LexiconQueryService } from './query/lexicon.query.service';

@Module({
  imports: [
    CommonModule,
    // Provide repositories for the entities used by the ingest flow.
    TypeOrmModule.forFeature([Word, User, Interaction, UserWordStatistics]),
  ],
  controllers: [LexiconController],
  providers: [
    LexiconIngestService,
    LexiconQueryService,
    RedisProfileService,
    InteractionService,
    CefrAssessmentService
  ],
  exports: [],
})
export class LexiconModule { }