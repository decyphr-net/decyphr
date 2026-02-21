import { Controller, Get, Logger, Param } from '@nestjs/common';
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

  private normalizeEventPayload(payload: unknown): NlpCompleteEventDto | null {
    let value: unknown = payload;

    // Some producers send { value: ... } envelopes or JSON strings.
    if (typeof value === 'object' && value !== null && 'value' in value) {
      value = (value as { value: unknown }).value;
    }
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (typeof value === 'object' && value !== null && 'value' in value) {
      const inner = (value as { value: unknown }).value;
      if (typeof inner === 'string') {
        try {
          value = JSON.parse(inner);
        } catch {
          return null;
        }
      }
    }

    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const event = value as Partial<NlpCompleteEventDto>;
    if (
      typeof event.clientId !== 'string' ||
      typeof event.language !== 'string' ||
      !Array.isArray(event.sentences)
    ) {
      return null;
    }

    return event as NlpCompleteEventDto;
  }

  @EventPattern('nlp.complete')
  async handleWordEncounter(
    @Payload() payload: unknown,
    @Ctx() context: KafkaContext,
  ) {
    const event = this.normalizeEventPayload(payload);
    if (!event) {
      this.logger.warn('Skipping invalid nlp.complete payload');
      return;
    }

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
