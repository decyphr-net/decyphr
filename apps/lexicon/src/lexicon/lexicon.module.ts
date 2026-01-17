import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClientsModule, Transport } from '@nestjs/microservices';
import { User, Word, WordForm } from 'src/bank/bank.entity';
import { CefrAssessmentService } from 'src/cefr/cefr.service';
import { CommonModule } from 'src/common/common.module';
import {
  Interaction,
  UserWordStatistics,
} from 'src/interaction/interaction.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { Statement, StatementToken } from 'src/statement/statement.entity';
import { StatementModule } from 'src/statement/statement.module';
import { StatementService } from 'src/statement/statement.service';
import { LexiconIngestService } from './ingest/lexicon.ingest.service';
import { LexiconController } from './lexicon.controller';
import { RedisProfileService } from './profile.service';
import { LexiconQueryService } from './query/lexicon.query.service';
import { WordScoringService } from './scoring.service';

@Module({
  imports: [
    CommonModule,
    StatementModule,
    // Provide repositories for the entities used by the ingest flow.
    TypeOrmModule.forFeature([
      Word,
      User,
      Interaction,
      UserWordStatistics,
      WordForm,
      Statement,
      StatementToken,
    ]),
    ClientsModule.register([
      {
        name: 'STATEMENT_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: ['kafka:9092'],
          },
          consumer: {
            groupId: 'statement-producer-group',
          },
        },
      },
    ]),
  ],
  controllers: [LexiconController],
  providers: [
    LexiconIngestService,
    LexiconQueryService,
    RedisProfileService,
    InteractionService,
    CefrAssessmentService,
    StatementService,
    WordScoringService,
  ],
  exports: [],
})
export class LexiconModule { }
