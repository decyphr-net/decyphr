import { Controller, Get, Logger, Param, ValidationPipe } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from '@nestjs/microservices';
import { CefrAssessmentService } from 'src/cefr/cefr.service';
import { LexiconIngestService } from './ingest/lexicon.ingest.service';
import { NlpCompleteEventDto } from './lexicon.dto';
import { LexiconQueryService } from './query/lexicon.query.service';
import { WordSnapshot } from './query/lexicon.query.types';

@Controller()
export class LexiconController {
  private readonly logger = new Logger(LexiconController.name);

  constructor(
    private readonly ingestService: LexiconIngestService,
    private readonly queryService: LexiconQueryService,
    private readonly cefrService: CefrAssessmentService,
  ) { }

  @EventPattern('nlp.complete')
  async handleWordEncounter(
    @Payload(new ValidationPipe({ transform: true }))
    event: NlpCompleteEventDto,
    @Ctx() context: KafkaContext,
  ) {
    try {
      await this.ingestService.ingestFromEvent(event);
      this.logger.debug(`Processed event ${event.requestId ?? '(no-id)'}`);
    } catch (err) {
      this.logger.error(
        `Error processing event ${event.requestId ?? '(no-id)'}: ${err}`,
        err as any,
      );
    }
  }

  @Get('snapshot/:clientId/:language')
  async getSnapshot(
    @Param('clientId') clientId: string,
    @Param('language') language: string,
  ): Promise<{
    snapshot: WordSnapshot[];
    cefr: { level: string; confidence: number };
  }> {
    const [snapshot, assessment] = await Promise.all([
      this.queryService.getUserWordSnapshot(clientId, language),
      this.cefrService.assess(clientId, language),
    ]);

    const cefr = {
      level: assessment.cefr,
      confidence: assessment.confidence,
    };

    return {
      snapshot,
      cefr,
    };
  }
}
